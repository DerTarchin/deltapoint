import React, { Component } from 'react';
import moment from 'moment';
import { 
  colorMap
} from '../utils';
import {
  thinsearch
} from '../utils/icons';

require('./History.css');

export default class Breakdown extends Component {
  state = {
    search: '',
    filter: [],
  }
  meta = {
    transactions: [],
  }

  componentDidMount = () => {
    console.log(this.props.history);
    const { history } = this.props;
    const end = moment(history.meta.last_updated, 'L'),
          day = moment(history.meta.start_date, 'L');
    while(day.isSameOrBefore(end, 'days')) {
      const d = history[day.format('L')]
      if(d && d.transactions) {
        this.meta.transactions.push(...d.transactions);
      }
      day.add(1, 'days');
    }
  }

  componentDidUpdate = prevProps => {
    if(prevProps.show !== this.props.show) {
      if(this.props.show) setTimeout(e => this.refs.input.focus(), 50);
      else {
        this.refs.input.value = '';
        this.setState({ search: '' });
      }
    }
  }

  render = () => {
    const typeMap = {
      buy: colorMap.tactical,
      sell: colorMap.other,
      fee: colorMap.rotation,
      adj: colorMap.conservative,
      transfer: colorMap.aggressive,
    }
    console.log(this.meta.transactions)
    return (
      <div className={`history ${this.props.show ? 'show' : ''}`}>
        <div className="history-window">
          <div className="search">
            <input 
              ref="input"
              onKeyDown={e => e.key !== 'Escape' && e.stopPropagation()}
              placeholder="Search History" 
              onChange={e => this.setState({ search: e.target.value })} 
            />
            { thinsearch }
          </div>
          <div className="content">
            <div className="transactions">
              <div className="filters">
                {
                  Object.keys(typeMap).map(type => {
                    return <div className="pill" style={{ background: typeMap[type] }} onClick={e => {
                      if(this.state.filter.includes(type)) {
                        this.setState({ filter: this.state.filter.filter(f => f !== type) });
                      } else {
                        this.setState({ filter: [...this.state.filter, type ] });
                      }
                    }}>
                      {type}
                    </div>
                  })
                }
              </div>
              {
                this.meta.transactions.map((t,i) => {
                  return <div key={i} className="row">
                    {JSON.stringify(t)}
                  </div>
                })
              }
            </div>
            <div className="details">
              hello world 2
            </div>
          </div>
        </div>
      </div>
    )
  }
}