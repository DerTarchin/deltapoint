import React, { Component } from 'react';
import moment from 'moment';
import {
  pagePos,
  frmt,
  debounce
} from '../utils'
import {
  doublearrow
} from '../utils/icons';

require('./DateScrubber.css');

const SCRUBBER_TICK = 2;
const SCRUBBER_RANGE = 90;
const WEEKDAY = date => date.day() && date.day() < 6;

export default class DateScrubber extends Component {
  state = {
    scrubberEnd: this.props.lastDay,
  }
  meta = {}

  componentWillMount = () => {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKey);
  }

  componentDidMount = () => {
    this.drawScrubber();
  }

  componentDidUpdate = prevProps => {
    // update render state based on parent header state
    if(prevProps.headerIndex !== this.props.headerIndex && this.props.headerIndex === 1) {
      this.meta.weekdays = null;
      this.setState({
        scrubberEnd: this.meta.activeScrubberEnd || this.props.lastDay
      }, this.drawScrubber);
    }
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

  drawScrubber = () => {
    if(this.props.headerIndex !== 1) return;
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
    weekdays.forEach((day, i) => {
      ctx.lineWidth = SCRUBBER_TICK;
      ctx.beginPath();

      const dates = this.meta.propActiveDates || this.props.activeDates;
      if(i === this.meta.canvasHighlight || [dates[0].format('L'), dates[1].format('L')].includes(day)) {
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
    const { canvas, dates } = this.refs;
    let callback, delay = 150;

    if(e.target === canvas && e.type !== 'mouseleave') {
      const distance = this.calcTickDistance(), 
            offset = SCRUBBER_TICK * .5,
            canvasPos = pagePos(canvas);
      canvasPos.y = canvasPos.y - this.refs.container.clientHeight;
      const highlight = Math.min(
        Math.floor((e.pageX - canvasPos.x + offset) / distance), 
        this.meta.weekdays.length-1
      );

      const day = moment(this.meta.weekdays[highlight], 'L');
      dates.innerHTML = this.renderDates([day, day]);

      if(this.meta.canvasHighlight === highlight) return;
      if(!this.meta.propActiveDates) {
        this.meta.propActiveDates = this.props.activeDates;
        this.meta.propActiveDateOpt = this.props.activeDateOpt;
      }
      callback = () => this.props.onDateChange('range', [day, day]);

      this.meta.canvasHighlight = highlight;
      this.drawScrubber();
    }
    else if(this.meta.canvasHighlight > -1) {
      this.meta.canvasHighlight = -1;
      this.drawScrubber();
      const { propActiveDateOpt, propActiveDates } = this.meta;
      dates.innerHTML = this.renderDates(propActiveDates);
      if(propActiveDateOpt > -1) {
        callback = () => this.props.onDateChange('opt', propActiveDateOpt);
      } else {
        callback = () => this.props.onDateChange('range', propActiveDates);
      }
      delay = 0;
      this.meta.propActiveDateOpt = -1;
      this.meta.propActiveDates = null;
    }

    if(callback) debounce(callback, delay, 'date-scrubber');
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
    while(diff < SCRUBBER_RANGE-1 && end[mod < 0 ? 'isSameOrBefore' : 'isBefore'](this.props.lastDay, 'days')) {
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

  renderDates = override => {
    const dates = (override || this.props.activeDates);
    const fmt = frmt(dates[0], dates[1]);
    if(fmt[0] === fmt[1]) return fmt[0];
    return `${fmt[0]} - ${fmt[1]}`;
    // console.log(frmt(dates[0], dates[1]))
    // fmt = sepFrmt(dates[0], dates[1]);
    // str = `${fmt[0].m} ${fmt[0].d}`;
    // if(fmt[0].useYear) str += `, ${fmt[0].y}`;
    // if(dates[0] !== dates[1]) {
    //   str += ` - ${fmt[1].m} ${fmt[1].d}`;
    //   if(fmt[1].useYear) str += `, ${fmt[1].y}`;
    // }
  }

  render = () => {
    const {
      weekdays // hover
    } = this.meta;

    return (
      <div ref="container" className="scrubber-container" onMouseMove={this.scrub} onMouseLeave={this.scrub}>
        <div className="scrubber">
          <div className="dates" ref="dates">{ this.renderDates() }</div>
          <canvas ref="canvas" onClick={this.scrubSelect} />
          <div 
            className={`arrow backwards ${weekdays && weekdays[0] === this.props.data.meta.start_date ? 'disabled' : ''}`} 
            ref="scrubBackwards" 
            onClick={this.scrubAdjust}
          >
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
      </div>
    )
  }

}