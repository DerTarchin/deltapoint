import moment from 'moment';
import { round } from '../utils';

// must be a valid date within the data otherwise an infinite loop will ensue
export const getLatest = (data, date=moment(), up) => {
  let latest = {}, day = date.clone();
  while(!latest.data) {
    const datestr = day.format('L');
    if(data[datestr]) {
      latest = { data: data[datestr], date: day.clone() };
    }
    day[up ? 'add' : 'subtract'](1, 'days');
  }
  return latest;
}

export const generateAggs = (props, stopDate=moment()) => {
  const { history, feeAdjustments } = props;
  const latest = getLatest(history, stopDate);

  const tradeDetails = {};
  const nulls = {
    buys: 0, // total money spent
    sells: 0, // total money back
    trades: 0, // total trades (includes adding to position, partial sells)
    cycles: 0, // total completed trades (all shares sold)
    fees: 0,
    dividends: 0,
    max_drawdown: 0,
    max_upside: 0,
    avg_pl_perc: 0,
    days_in_trade: 0,
    avg_days_in_trade: 0,
    perc_days_in_trade: 0,
    total_pl: 0,
    total_pl_perc: 0,
    sell_trades: null,
    current: null
  }

  history.meta.symbols_traded.forEach(sym => {
    const key = sym;
    const details = {
      ...nulls,
      years: {},
      ...tradeDetails[key],
    }
    // remove those that are unnecessary in overall metrics
    delete details.perc_days_in_trade;
    delete details.sell_trades;

    const day = moment(history.meta.start_date, 'L');
    let lastPos, sells = 0;
    const calcAvg = (src, lastPos) => {
      return (src.avg_days_in_trade * src.cycles + day.diff(lastPos.since, 'days') + 1) / (src.cycles + 1);
    }
    while(day.isSameOrBefore(stopDate, 'days')) {
      if(!(day.year() in details.years)) {
        details.years[day.year()] = { ...nulls };
        delete details.years[day.year()].current; // not tracked in per-year breakdown
      }
      const yearDetails = details.years[day.year()];
      const data = history[day.format('L')];
      if(!data) {
        day.add(1, 'days');
        if(lastPos) {
          details.days_in_trade++;
          yearDetails.days_in_trade++;
        }
        continue;
      }
      const transactions = (data.transactions || []).filter(t => t.symbol === sym);
      const pos = data.positions[sym];
      // if new pos
      if(pos) details.current = {
        max_upside: 0,
        max_drawdown: 0,
        days_in_trade: 0,
        ...details.current,
        ...pos,
      };
      if(!pos && lastPos) details.current = null;

      let adj = 0;
      if(feeAdjustments) {
        const coms = history.meta.commission.filter(c => moment(c[0], 'L').isSameOrBefore(day));
        adj = coms[coms.length - 1][1];
      }

      // calc all trades and dividends
      let latestBuy = [], latestSell = [];
      for(let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        if(['buy','sell'].includes(t.type)) {
            details.trades++;
            yearDetails.trades++;
        }
        if(t.type === 'buy') {
          latestBuy.push(t);
          details.buys += t.amount + adj;
          yearDetails.buys += t.amount + adj;
          details.fees += t.commission + t.reg_fee;
          yearDetails.fees += t.commission + t.reg_fee;
        }
        if(t.type === 'sell') {
          sells++;
          latestSell.push(t);
          if(!pos) {
            if(lastPos) {
              details.avg_days_in_trade = calcAvg(details, lastPos);
              yearDetails.avg_days_in_trade = calcAvg(yearDetails, lastPos);
            }
            details.cycles++;
            yearDetails.cycles++;
            // calc avg days in trade using "since" field in pos (always off by one)
          }
          details.sells += t.amount + adj;
          yearDetails.sells += t.amount + adj;
          details.fees += t.commission + t.reg_fee;
          yearDetails.fees += t.commission + t.reg_fee;
        }
        if(t.type === 'dividend') {
          details.dividends += t.amount;
          yearDetails.dividends += t.amount;
          details.sells += t.amount;
          yearDetails.sells += t.amount;
        }
      }

      // calc max upside, downside and days in trade
      if(pos || latestBuy.length || latestSell.length) {
        const getPriceAvg = (ts, removeFees, key) => {
          if(key === 'h') return ts.reduce((total, val) => Math.max(total, val.h || 0), 0);
          if(key === 'l') return ts.reduce((total, val) => Math.min(total, val.l || 0), Number.MAX_SAFE_INTEGER);
          const totalShares = ts.reduce((total, val) => total + val.shares, 0);
          const totalAmount = ts.reduce((total, val) => total + (removeFees ? val.shares * val.price : val.amount), 0);
          return Math.abs(totalAmount / totalShares);
        }
        // gets current position, a sold position, or a day trade avg
        const buy = (pos || lastPos || {}).avg || getPriceAvg(latestBuy),
              trueBuy = (pos || lastPos || {}).avg || getPriceAvg(latestBuy, true),
              sell = pos ? pos.c : getPriceAvg(latestSell),
              highs = pos ? pos.h : getPriceAvg(latestSell, null, 'h'),
              lows = pos ? pos.l : getPriceAvg(latestSell, null, 'l'); // to calc intra-day highs
        if(pos) {
          details.days_in_trade++;
          yearDetails.days_in_trade++;
          // calc % of the year spent in trades
          yearDetails.perc_days_in_trade = (yearDetails.days_in_trade * 100) / 365;
          details.current.days_in_trade++;
        }
        let perc =  100 * (highs - trueBuy) / trueBuy; // to calc intra-day highs
        // calc max drawdowns and gains
        details.max_upside = Math.max(details.max_upside, perc);
        yearDetails.max_upside = Math.max(yearDetails.max_upside, perc);
        if(pos) details.current.max_upside = Math.max(details.current.max_upside, perc);
        perc =  100 * (lows - trueBuy) / trueBuy; // to calc intra-day lows
        details.max_drawdown = Math.min(details.max_drawdown, perc);
        yearDetails.max_drawdown = Math.min(yearDetails.max_drawdown, perc);
        if(pos) details.current.max_drawdown = Math.min(details.current.max_drawdown, perc)

        // store sells as P/L, calc avg P/L
        perc = 100 * (sell - buy) / buy;
        for(let j = 0; j < latestSell.length; j++) {
          if(!yearDetails.sell_trades) yearDetails.sell_trades = [];
          details.avg_pl_perc = (details.avg_pl_perc * (sells - 1) + perc) / sells;
          yearDetails.avg_pl_perc = (yearDetails.avg_pl_perc * yearDetails.sell_trades.length + perc) / (yearDetails.sell_trades.length + 1);
          yearDetails.sell_trades.push([latestSell[j], buy, perc]);
        }
      }

      // calc final values
      if(day.isSame(latest.date, 'days')) {

        // apply current trades
        if(pos) {
          details.sells += pos.shares * pos.c;
          yearDetails.sells += pos.shares * pos.c;
        }
        // for every year, apply any remaining trades at end of year as "sells"
        // and "buys" for the next year
        Object.keys(details.years).forEach(year => {
          // first day of year, add current positions (as long as they were held previously)
          let yDate = moment(`1/1/${year}`, 'L');
          if(yDate.isBefore(stopDate)) {
            while(!history[yDate.format('L')]) yDate.add(1, 'days');
            const yPos = history[yDate.format('L')].positions[sym];
            if(yPos) {
              let shares = yPos.shares;
              (history[yDate.format('L')].transactions || []).forEach(t => {
                if(t.symbol === sym && t.type === 'buy') shares -= t.shares;
              })
              details.years[year].buys -= shares * yPos.c;
            } 
          }
          // last day of year
          yDate = moment(`12/31/${year}`, 'L');
          if(yDate.isBefore(stopDate)) {
            while(!history[yDate.format('L')]) yDate.subtract(1, 'days');
            const yPos = history[yDate.format('L')].positions[sym];
            if(yPos) details.years[year].sells += yPos.shares * yPos.c;
          }
        })
        
        // calc totals
        details.total_pl = details.sells - Math.abs(details.buys);
        let perc = 100 * details.total_pl / Math.abs(details.buys);
        details.total_pl_perc = perc;
        Object.keys(details.years).forEach(year => {
          const yDetails = details.years[year];
          yDetails.total_pl = yDetails.sells - Math.abs(yDetails.buys);
          perc = 100 * yDetails.total_pl / Math.abs(yDetails.buys);
          yDetails.total_pl_perc = perc;
        })
      }

      // iterate
      tradeDetails[key] = details;
      lastPos = pos;
      day.add(1, 'days');
    }
  });
console.log(tradeDetails)
  return tradeDetails;
}