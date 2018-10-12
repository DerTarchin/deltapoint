import React, { Component } from 'react';
import anime from 'animejs';
import moment from 'moment';
import { 
  Portfolio, 
  Balances, 
  Volatility, 
  Breakdown, 
  Charts 
} from './components';
import {
  pagePos,
  frmt,
  sepFrmt,
} from './utils'
import {
  threedot,
  doublearrow
} from './utils/icons';

require('./interface.css');

const TILE_INTRO_DURATION = 1000;
const TILE_INTRO_DELAY = 100;
const SCRUBBER_TICK = 2;
const SCRUBBER_RANGE = 90;
const WEEKDAY = date => date.day() && date.day() < 6;

export default class Interface extends Component {
  state = {
    headerIndex: 0,
    scrubberEnd: this.props.lastDay,
    highlightDate: null,
  }
  meta = {}

  componentWillMount = () => {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKey);
  }

  componentDidMount = () => {
    const isSmall = window.innerWidth <= 767;
    this.drawScrubber();
    this.meta.tileAnime = anime.timeline().add({
      targets: isSmall ?
      [
        '#portfolio',
        '#balances',
        '#volatility',
        '#breakdown',
        '#charts',
      ] : [
        '#portfolio',
        '#breakdown',
        '#balances',
        '#charts',
        '#volatility',
      ],
      opacity: [0,1],
      scale: [.8, 1],
      easing: 'easeInOutSine',
      duration: TILE_INTRO_DURATION,
      delay: (el, i, l) => i * TILE_INTRO_DELAY
    }).add({
      targets: this.refs.header,
      opacity: [0,1],
      easing: 'easeInOutSine',
      duration: TILE_INTRO_DURATION,
      offset: TILE_INTRO_DELAY * 2
    });
    this.meta.mounted = true;
  }

  componentWillReceiveProps = props => {
    // animation of dates in the header when adjusting dates
    if(!this.state.headerIndex && this.props.activeDates !== props.activeDates) { // first header visible
      const dates = this.refs.dates || document.querySelector('#header-basic .dates');
      const years = [...dates.getElementsByClassName('year')],
            rest = [...dates.getElementsByClassName('rest')];
      const fromStartDate = moment(`${rest[0].textContent} ${years[0] ? years[0].textContent : this.props.lastDay.year()}`, 'MMM DD YYYY'),
            toStartDate = rest[1] ? moment(`${rest[1].textContent} ${years[1] ? years[1].textContent : this.props.lastDay.year()}`, 'MMM DD YYYY') : fromStartDate.clone();
      const fromDiff = props.activeDates[0].diff(fromStartDate, 'days'),
            toDiff = props.activeDates[1].diff(toStartDate, 'days');
      const diffs = { fromdiff: 0, todiff: 0, fromdiffhistory: 0, todiffhistory: 0 };
      if(this.meta.dateMenuAnim) this.meta.dateMenuAnim.pause();
      this.meta.dateMenuAnim = anime({
        targets: diffs, 
        fromdiff: fromDiff,
        todiff: toDiff,
        easing: 'easeOutExpo',
        round: 1,
        duration: 700,
        update: () => {
          if(diffs.fromdiffhistory === diffs.fromdiff && diffs.todiffhistory === diffs.todiff) return;
          const currFromDate = fromStartDate.clone().add(diffs.fromdiff, 'days'),
                currToDate = toStartDate.clone().add(diffs.todiff, 'days');
          if(years.length) {
            years[0].innerHTML = currFromDate.year();  
            if(years[1]) years[1].innerHTML = currToDate.year();
          }
          rest[0].innerHTML = currFromDate.format('MMM D');
          if(rest[1]) rest[1].innerHTML = currToDate.format('MMM D');
          diffs.fromdiffhistory = diffs.fromdiff;
          diffs.todiffhistory = diffs.todiff;
        }
      })
    }
  }

  componentDidUpdate = () => {
    // move selected opt backgrounds
    const { activeDateOpt, dataView } = this.props;
    let bg = this.refs.dateOptBg;
    if(activeDateOpt < 0) bg.style.opacity = 0;
    else if(!this.meta.loaded || parseFloat(bg.getAttribute('data-index')) !== activeDateOpt) {
      const opt = this.refs.dateOpts.querySelectorAll('[data-opt]')[activeDateOpt].getBoundingClientRect();
      const offset = this.refs.dateOpts.getBoundingClientRect().left;
      bg.style.opacity = 1;
      bg.style.width = opt.width+'px';
      bg.style.height = opt.height+'px';
      bg.style.left = (opt.left - offset)+'px';
    }
    bg = this.refs.appOptBg;
    const { dvDollar, dvPerc } = this.refs;
    const offset = this.refs.appOpts.getBoundingClientRect().left;
    const rect = (dataView === '$' ? dvDollar : dvPerc).getBoundingClientRect();
    bg.style.opacity = 1;
    bg.style.width = rect.width+'px';
    bg.style.height = rect.height+'px';
    bg.style.left = (rect.left - offset)+'px';
    this.meta.loaded = true;
  }

  componentWillUnmount = () => {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKey);
  }

  handleResize = e => {
    this.meta.canvas = null;
    setTimeout(() => {
      if(!this.meta.canvas) this.drawScrubber();
    }, 50)
  }

  handleKey = e => {
    const { onSettingsChange, onDateChange } = this.props;
    switch(e.code) {
      case 'Space': return this.changeHeader();
      case 'KeyD': 
        if(this.state.headerIndex) this.changeHeader();
        onSettingsChange('dataView', '$');
        return;
      case 'KeyP': 
        if(this.state.headerIndex) this.changeHeader();
        onSettingsChange('dataView', '%');
        return;
      case 'KeyF': 
        if(this.state.headerIndex) this.changeHeader();
        onSettingsChange('feeAdjustments', !this.props.feeAdjustments);
        return;
      case 'KeyA': 
        if(this.state.headerIndex) this.changeHeader();
        onSettingsChange('contributionAdjustments', !this.props.contributionAdjustments);
        return;
      case 'Digit1': 
        if(this.state.headerIndex) this.changeHeader();
        onDateChange('opt', 0);
        return;
      case 'Digit3': 
        if(this.state.headerIndex) this.changeHeader();
        onDateChange('opt', 1);
        return;
      case 'Digit6': 
        if(this.state.headerIndex) this.changeHeader();
        onDateChange('opt', 2);
        return;
      case 'KeyY': 
        if(this.state.headerIndex) this.changeHeader();
        onDateChange('opt', 3);
        return;
      default: return;
    }
  }

  changeHeader = e => {
    const newState = {
      headerIndex: (this.state.headerIndex + 1) % 2
    }
    if(newState.headerIndex === 1) {
      this.meta.weekdays = null;
      newState.scrubberEnd = this.meta.activeScrubberEnd || this.props.lastDay;
    }
    this.setState(newState, newState.headerIndex === 1 ? this.drawScrubber : null);
  }

  drawScrubber = () => {
    if(this.state.headerIndex !== 1) return;
    const { canvas } = this.refs, rect = canvas.getBoundingClientRect();
    // init canvas if initial render 
    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      this.meta.canvas = canvas.getContext('2d');
      this.meta.canvas.scale(dpr, dpr);
      return this.meta.canvas;
    }
    const setupTicks = () => {
      const weekdays = [];
      const time = this.state.scrubberEnd.clone();
      while(weekdays.length < SCRUBBER_RANGE && time.isSameOrAfter(moment(this.props.data.meta.start_date, 'L'), 'days')) {
        if(WEEKDAY(time)) weekdays.unshift(time.format('L'));
        time.subtract(1, 'days');
      }
      this.meta.weekdays = weekdays;
      this.forceUpdate();
      return weekdays;
    }

    // if weekdays have not been initialized or year changed
    const weekdays = this.meta.weekdays || setupTicks();
    // draw calendar
    const ctx = this.meta.canvas || setupCanvas();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const distance = this.calcTickDistance();
    const offset = SCRUBBER_TICK; // first one gets drawn in half
    // ctx.globalAlpha = 0.2;
    weekdays.forEach((day, i) => {
      ctx.lineWidth = SCRUBBER_TICK;
      ctx.beginPath();

      const dates = this.meta.propActiveDates || this.props.activeDates;
      if( i === this.meta.canvasHighlight ||
         [dates[0].format('L'), dates[1].format('L')].includes(day)
      ) {
        ctx.strokeStyle = '#fff'
        ctx.moveTo(distance * i + offset, rect.height * .25);
        ctx.lineTo(distance * i + offset, rect.height);
      } else if(moment(day, 'L').isBetween(dates[0], dates[1])) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.moveTo(distance * i + offset, rect.height * .25);
        ctx.lineTo(distance * i + offset, rect.height * .75);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.moveTo(distance * i + offset, rect.height * .25);
        ctx.lineTo(distance * i + offset, rect.height * .75);
      }
      ctx.stroke();
    })
  }

  calcTickDistance = () => {
    const days = this.meta.weekdays.length;
    const { canvas } = this.refs, rect = canvas.getBoundingClientRect();
    let distance = rect.width / days;
    // recalc width to get rid of empty space at back
    const calcWidth = rect.width + distance - (SCRUBBER_TICK * 2);

    return calcWidth / days;
  }

  scrub = e => {
    // calc hover highlight
    const { canvas } = this.refs;
    if(e.target === canvas) {
      const distance = this.calcTickDistance(), offset = SCRUBBER_TICK * .5,
            canvasPos = pagePos(canvas);
      canvasPos.y = canvasPos.y - document.getElementById('header-cal').clientHeight;
      const highlight = Math.min(
        Math.floor((e.pageX - canvasPos.x + offset) / distance), 
        this.meta.weekdays.length-1
      );
      if(this.meta.canvasHighlight === highlight) return;
      const day = moment(this.meta.weekdays[highlight], 'L');
      if(!this.meta.propActiveDates) {
        this.meta.propActiveDates = this.props.activeDates;
        this.meta.propActiveDateOpt = this.props.activeDateOpt;
      }
      this.props.onDateChange('range', [day, day]);
      this.setState({ 
        highlightDate: frmt(day, moment())[0],
      });
      this.meta.canvasHighlight = highlight;
      this.drawScrubber();
    }
    else if(this.meta.canvasHighlight > -1) {
      this.setState({ highlightDate: null });
      if(this.meta.propActiveDateOpt > -1) this.props.onDateChange('opt', this.meta.propActiveDateOpt);
      else this.props.onDateChange('range', this.meta.propActiveDates);
      this.meta.canvasHighlight = -1;
      this.drawScrubber(); // draw before propActiveDates are cleared
      this.meta.propActiveDateOpt = -1;
      this.meta.propActiveDates = null;
    }
  }

  scrubSelect = e => {
    const selectedDate = moment(this.meta.weekdays[this.meta.canvasHighlight], 'L');
    const dates = this.meta.propActiveDates;
    if(dates[0] === dates[1] && selectedDate.format('L') === dates[0].format('L')) return;
    if(dates[0] === dates[1]) {
      // put the earlier date first
      if(dates[0].isBefore(selectedDate)) {
        this.meta.propActiveDates = [dates[0], selectedDate];
        this.meta.activeScrubberEnd = this.state.scrubberEnd;
      }
      else this.meta.propActiveDates = [selectedDate, dates[0]];
    }
    else {
      this.meta.propActiveDates = [selectedDate, selectedDate];
      this.meta.activeScrubberEnd = this.state.scrubberEnd;
    }
    this.meta.propActiveDateOpt = -1;
    this.props.onDateChange('range', this.meta.propActiveDates);
    this.drawScrubber();
  }

  scrubAdjust = e => {
    this.meta.weekdays = null;
    let end = moment(this.state.scrubberEnd.format('L'), 'L'); // trims time
    const mod = e.currentTarget === this.refs.scrubBackwards ? -1 : 1;
    let diff = 0;
    // shift by RANGE or (if upward) until last day
    while(diff < SCRUBBER_RANGE-1 && end.isSameOrBefore(this.props.lastDay, 'days')) {
      if(WEEKDAY(end)) diff++;
      end.add(mod, 'days');
    }
    // if backwards and before start_date, shift back up to fit RANGE
    if(mod < 0) {
      let ticks = 0;
      const start = end.clone();
      while(ticks < SCRUBBER_RANGE && start.isSameOrAfter(moment(this.props.data.meta.start_date, 'L'), 'days')) {
        if(WEEKDAY(start)) ticks++;
        start.subtract(1, 'days');
      }
      if(ticks < SCRUBBER_RANGE) { // start date was hit
        diff = 0;
        end = moment(this.props.data.meta.start_date, 'L');
        // shift by RANGE or (if upward) until last day
        while(diff < SCRUBBER_RANGE-1 && end.isSameOrBefore(this.props.lastDay, 'days')) {
          if(WEEKDAY(end)) diff++;
          end.add(1, 'days');
        }
      }
    }
    this.setState({ scrubberEnd: end }, this.drawScrubber)
  }

  render = () => {
    const { 
      headerIndex,
      highlightDate
    } = this.state;
    const {
      weekdays // hover
    } = this.meta;
    const {
      activeDates,
      dataView,
      feeAdjustments,
      contributionAdjustments,
      onSettingsChange,
      onDateChange
    } = this.props;

    const renderDates = useRef => {
      const fmt = sepFrmt(activeDates[0], activeDates[1]);
      const props = {};
      if(useRef) props.ref = 'dates';
      else if(highlightDate) return <div className="dates">{highlightDate}</div>;
      if(activeDates[0] === activeDates[1]) return (
        <div className="dates" {...props} key={highlightDate}>
          <span className="rest">{fmt[0].m} {fmt[0].d}</span> 
          {fmt[0].useYear ? <span className="year">, {fmt[0].y}</span> : null}
        </div>
      );
      return (
        <div className="dates" {...props} key={highlightDate}>
          <span className="rest">{fmt[0].m} {fmt[0].d}</span> 
          {fmt[0].useYear ? <span className="year">, {fmt[0].y}</span> : null}
          {` - `}
          <span className="rest">{fmt[1].m} {fmt[1].d}</span> 
          {fmt[1].useYear ? <span className="year">, {fmt[1].y}</span> : null}
        </div>
      )
    }

    return (
      <div className="interface">
        <div className="bg" />
        
        <div ref="header" className="interface-header">
          <div className="header-slider" data-slide={headerIndex}>
            <section id="header-basic">
              <div className="header-left">
                <ul ref="appOpts" className="app-opts">
                  <div ref="appOptBg" className="bg" data-index={-1} />
                  <li 
                    className={`icon ${dataView === '$' ? 'active' : ''}`}
                    ref="dvDollar"
                    title="Use dollar change"
                    onClick={dataView === '$' ? null : () => onSettingsChange('dataView', '$')}
                  ><div className="clickitem">$</div></li>
                  <li 
                    className={`icon ${dataView === '%' ? 'active' : ''}`}
                    ref="dvPerc"
                    title="Use percent change"
                    onClick={dataView === '%' ? null : () => onSettingsChange('dataView', '%')}
                  ><div className="clickitem">%</div></li>
                  <li className="divider" />
                  <li 
                    className={`single ${feeAdjustments ? 'active' : ''}`}
                    title="Toggle fee-adjusted values"
                    onClick={() => onSettingsChange('feeAdjustments', !feeAdjustments)}
                  ><div className="clickitem">Fees</div></li>
                  <li 
                    className={`single ${contributionAdjustments ? 'active' : ''}`}
                    title="Toggle backwards contribution adjustments"
                    onClick={() => onSettingsChange('contributionAdjustments', !contributionAdjustments)}
                  ><div className="clickitem">Adj</div></li>
                </ul>
              </div>
              {renderDates(true)}
              <div className="header-right">
                <ul ref="dateOpts" className="date-opts">
                  <div ref="dateOptBg" className="bg" data-index={-1} />
                  {
                    this.props.dateOpts.map((opt, i) => {
                      const active = this.props.activeDateOpt === i,
                            formatted = frmt(opt.start, opt.end);
                      const range = `${formatted[0]} - ${formatted[1]}`;
                      return <li 
                        key={i}
                        className={active ? 'active' : ''}
                        data-opt={i}
                        title={range}
                        onClick={active ? null : () => onDateChange('opt', i)}
                      ><div className="clickitem">{opt.range_count}<span>{opt.range_type}</span></div></li>
                    })
                  }
                </ul>
              </div>
            </section>
            <section id="header-cal" onMouseMove={this.scrub}>
              <div className="scrubber" ref="scrubber">
                {renderDates()}
                <canvas ref="canvas" onClick={this.scrubSelect} />
                <div className={`arrow backwards ${weekdays && weekdays[0] === this.props.data.meta.start_date ? 'disabled' : ''}`} ref="scrubBackwards" onClick={this.scrubAdjust}>
                  <span className="clickitem">{doublearrow}</span>
                </div>
                <div 
                  className={`arrow forwards ${weekdays && weekdays[weekdays.length-1] === this.props.lastDay.format('L') ? 'disabled' : ''}`} 
                  ref="scrubForwards" 
                  onClick={this.scrubAdjust}
                >
                  <span className="clickitem">{doublearrow}</span>
                </div>
                {
                  !weekdays ? null : [
                    <div key="from" className="from">{frmt(moment(weekdays[0], 'L'), moment(weekdays[weekdays.length-1], 'L'))[0]}</div>,
                    <div key="to" className="to">{frmt(moment(weekdays[0], 'L'), moment(weekdays[weekdays.length-1], 'L'))[1]}</div>
                  ]
                }
              </div>
            </section>
          </div>
          <div
            className="menu-icon"
            onClick={this.changeHeader}
          ><div className="clickitem">{threedot}</div></div>
        </div>

        <div className="interface-content" onMouseEnter={this.scrub}>
          <section className="tile-col left">
            <Portfolio {...this.props} />
            <Balances {...this.props} />
            <Volatility {...this.props} />
          </section>
          <section className="tile-col right">
            <Breakdown {...this.props} />
            <Charts {...this.props} />
          </section>
        </div>
      </div>
    )
  }

}