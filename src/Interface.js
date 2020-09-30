import React, { Component } from 'react';
import anime from 'animejs';
import moment from 'moment';
import { 
  Portfolio, 
  Balances, 
  Volatility, 
  Breakdown, 
  Charts,
  DateScrubber,
  History,
} from './components';
import {
  frmt,
  sepFrmt,
} from './utils'
import {
  threedot
} from './utils/icons';

require('./Interface.css');

const TILE_INTRO_DURATION = 1000;
const TILE_INTRO_DELAY = 100;

export default class Interface extends Component {
  state = {
    headerIndex: 0,
    scrubberEnd: this.props.lastDay,
    showHelp: false,
    showHistory: false,
  }
  meta = {}

  componentWillMount = () => {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKey);
  }

  componentWillReceiveProps = props => {
    // console.log(props.activeDates, this.props.activeDates)
  }

  componentDidUpdate = prevProps => {
    const { activeDateOpt, activeDates, dataView } = this.props;

    // animation of dates in the header when adjusting dates
    console.log(this.state.headerIndex, prevProps.activeDates, activeDates)
    if(!this.state.headerIndex && prevProps.activeDates !== activeDates) { // first header visible
      const dates = this.refs.dates || document.querySelector('#header-basic .dates');
      const years = [...dates.getElementsByClassName('year')],
            rest = [...dates.getElementsByClassName('rest')];
      const fromStartDate = moment(`${rest[0].textContent} ${years[0] ? years[0].textContent : prevProps.lastDay.year()}`, 'MMM DD YYYY'),
            toStartDate = rest[1] ? moment(`${rest[1].textContent} ${years[1] ? years[1].textContent : prevProps.lastDay.year()}`, 'MMM DD YYYY') : fromStartDate.clone();
      const fromDiff = activeDates[0].diff(fromStartDate, 'days'),
            toDiff = activeDates[1].diff(toStartDate, 'days');
      const diffs = { fromdiff: 0, todiff: 0, fromdiffhistory: 0, todiffhistory: 0 };
      console.log('hi')
      if(this.meta.dateMenuAnim) this.meta.dateMenuAnim.pause();
      this.meta.dateMenuAnim = anime({
        targets: diffs, 
        fromdiff: fromDiff,
        todiff: toDiff,
        easing: 'easeOutExpo',
        round: 1,
        duration: 700,
        update: () => {
          console.log('hi')
          if(diffs.fromdiffhistory === diffs.fromdiff && diffs.todiffhistory === diffs.todiff) return;
          const currFromDate = fromStartDate.clone().add(diffs.fromdiff, 'days'),
                currToDate = toStartDate.clone().add(diffs.todiff, 'days');
          if(years.length) {
            years[0].innerHTML = ', ' + currFromDate.year();
            if(years[1]) years[1].innerHTML = ', ' + currToDate.year();
          }
          rest[0].innerHTML = currFromDate.format('MMM D');
          if(rest[1]) rest[1].innerHTML = currToDate.format('MMM D');
          diffs.fromdiffhistory = diffs.fromdiff;
          diffs.todiffhistory = diffs.todiff;
        }
      })
    } 
    // move selected opt backgrounds
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

  handleKey = e => {
    const { onSettingsChange, onDateChange } = this.props;
    switch(e.code) {
      case 'Space': 
        e.preventDefault();
        e.stopPropagation();
        return this.changeHeader();
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
      // case 'Digit6': 
      //   if(this.state.headerIndex) this.changeHeader();
      //   onDateChange('opt', 2);
      //   return;
      case 'KeyY': 
        if(this.state.headerIndex) this.changeHeader();
        onDateChange('opt', 2);
        return;
      case 'KeyM': 
        if(this.state.headerIndex) this.changeHeader();
        onDateChange('opt', 3);
        return;
      case 'Slash':
        this.setState({ showHelp: !this.state.showHelp });
      case 'KeyH':
        this.setState({ showHistory: !this.state.showHistory });
      default: return;
    }
  }

  changeHeader = e => {
    const newState = {
      headerIndex: (this.state.headerIndex + 1) % 3
    }
    if(newState.headerIndex === 1) {
      this.meta.weekdays = null;
      newState.scrubberEnd = this.meta.activeScrubberEnd || this.props.lastDay;
    }
    this.setState(newState);
  }

  renderDates = () => {
    const { activeDates } = this.props;

    const fmt = sepFrmt(activeDates[0], activeDates[1]);
    if(activeDates[0] === activeDates[1]) return (
      <div className="dates" ref="dates">
        <span className="rest">{fmt[0].m} {fmt[0].d}</span> 
        {fmt[0].useYear ? <span className="year">, {fmt[0].y}</span> : null}
      </div>
    );
    return (
      <div className="dates" ref="dates">
        <span className="rest">{fmt[0].m} {fmt[0].d}</span> 
        {fmt[0].useYear ? <span className="year">, {fmt[0].y}</span> : null}
        <span>{` - `}</span>
        <span className="rest">{fmt[1].m} {fmt[1].d}</span> 
        {fmt[1].useYear ? <span className="year">, {fmt[1].y}</span> : null}
      </div>
    )
  }

  render = () => {
    const { 
      headerIndex
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

              { this.renderDates() }

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

            <section id="header-cal">
              <DateScrubber {...this.props} headerIndex={headerIndex} />
            </section>

            <section id="header-btns">
              <div>hello world</div>
            </section>
          </div>
          <div
            className="menu-icon"
            onClick={this.changeHeader}
          ><div className="clickitem">{threedot}</div></div>
        </div>

        <div className="interface-content">
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