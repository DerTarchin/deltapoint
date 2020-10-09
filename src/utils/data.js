import moment from 'moment';

// must be a valid date within the data otherwise an infinite loop will ensue
export const getLatest = (data, date, up) => {
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
    while(day.isSameOrBefore(stopDate, 'days')) {
      if(!(day.year() in details.years)) details.years[day.year()] = { ...nulls };
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

      let adj = 0;
      if(feeAdjustments) {
        const coms = history.meta.commission.filter(c => moment(c[0], 'L').isSameOrBefore(day));
        adj = coms[coms.length - 1][1];
      }

      // calc all trades and dividends
      let latestBuy = [], latestSell = [];
      transactions.forEach(t => {
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
              const calcAvg = src => {
                return (src.avg_days_in_trade * src.cycles + day.diff(lastPos.since, 'days') + 1) / (src.cycles + 1);
              }
              details.avg_days_in_trade = calcAvg(details);
              yearDetails.avg_days_in_trade = calcAvg(yearDetails);
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
      })

      // calc max upside, downside and days in trade
      if(pos || latestBuy.length || latestSell.length) {
        const getPriceAvg = ts => {
          const totalShares = ts.reduce((total, val) => total + val.shares, 0);
          const totalAmount = ts.reduce((total, val) => total + val.amount, 0);
          return totalAmount / totalShares;
        }
        // gets current position, a sold position, or a day trade avg
        const buy = (pos || lastPos || {}).avg || getPriceAvg(latestBuy),
              sell = pos ? pos.c : getPriceAvg(latestSell);
        if(pos) {
          details.days_in_trade++;
          yearDetails.days_in_trade++;
          // calc % of the year spent in trades
          yearDetails.perc_days_in_trade = (yearDetails.days_in_trade * 100) / 365;
        }
        const perc = 100 * (sell - buy) / buy;
        // calc max drawdowns and gains
        details.max_drawdown = Math.min(details.max_drawdown, perc);
        yearDetails.max_drawdown = Math.min(yearDetails.max_drawdown, perc);
        details.max_upside = Math.max(details.max_upside, perc);
        yearDetails.max_upside = Math.max(yearDetails.max_upside, perc);
        // store sells as P/L, calc avg P/L
        latestSell.forEach(trade => {
          if(!yearDetails.sell_trades) yearDetails.sell_trades = [];
          details.avg_pl_perc = (details.avg_pl_perc * (sells - 1) + perc) / sells;
          yearDetails.avg_pl_perc = (yearDetails.avg_pl_perc * yearDetails.sell_trades.length + perc) / (yearDetails.sell_trades.length + 1);
          yearDetails.sell_trades.push([trade, buy, perc]);
        })
      }

      // calc final values
      if(day.isSame(latest.date, 'days')) {

        // apply current trades
        if(pos) {
          details.sells += pos.shares * pos.c;
          yearDetails.sells += pos.shares * pos.c;
        }
        
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

  return tradeDetails;
}