import React, { Component } from 'react';
import moment from 'moment';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
// https://github.com/abelheinsbroek/chartjs-plugin-crosshair
// import 'chartjs-plugin-crosshair';
// TODO: use glows from this plugin
// https://nagix.github.io/chartjs-plugin-style/
import { 
  formatMoney, 
  frmt, 
  round 
} from '../utils';

require('./Portfolio.css');

export default class Portfolio extends Component {
  state = {};
  meta = {}

  componentWillMount = () => {
    this.calcData();
  }

  componentDidUpdate = prevProps => {
    // check if data changed
    let dataChanged = false;
    if(prevProps.data !== this.props.data) dataChanged = true;
    if(prevProps.dataView !== this.props.dataView) dataChanged = true;
    if(prevProps.feeAdjustments !== this.props.feeAdjustments) dataChanged = true;
    if(prevProps.contributionAdjustments !== this.props.contributionAdjustments) dataChanged = true;
    if(dataChanged) this.calcData();
  }

  calcData = () => {
    const { history, activeDates, data, dataView } = this.props;

    if(activeDates[0].isSame(activeDates[1])) return;
    const datesKeys = Object.keys(data).filter(key => key !== 'meta' && data[key]);

    const chartData = {
      labels: datesKeys,
      datasets: [
        {
          fill: false,
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          borderCapStyle: 'butt',
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: 'miter',
          pointBorderColor: 'rgba(0,0,0,0)',
          pointBorderWidth: 0,
          pointBackgroundColor: '#fff',
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#fff',
          pointRadius: 1,
          pointHitRadius: 10,
          data: datesKeys.map(key => {
            if(dataView === '$') return data[key].adj.balance;
            if(dataView === '%') return data[key].adj.plPerc;
          }),
        }
      ]
    }

    let lineTension = 0.4; 
    if(datesKeys.length > 200) lineTension = 0.25;
    if(datesKeys.length > 400) lineTension = 0.01;

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      legend: false,
      elements: {
        line: {
          tension: lineTension
        },
        point: {
          borderWidth: 0
        }
      },
      annotation: {
        // annotations: [{
        //   type: 'line',
        //   mode: 'horizontal',
        //   scaleID: 'y-axis-0',
        //   value: 0,
        //   borderColor: 'rgb(75, 192, 192)',
        //   borderWidth: 4,
        //   label: {
        //     enabled: true,
        //     content: '0'
        //     // format label: https://github.com/chartjs/chartjs-plugin-annotation
        //   }
        // }]
      },
      layout: {
        padding: 10,
      },
      scales: {
        yAxes: [{
          gridLines: {
            display: false,
            drawBorder: false,
          },
          scaleID: 'y-axis-0',
          display: false
        }],
        xAxes: [{
          gridLines: {
            display: false,
            drawBorder: false,
          },
          display: false
        }]
      },
      hover: {
        intersect: false,
        mode: 'index',
        animationDuration: 0.01
      },
      // plugins: {
      //   crosshair: {
      //     snap: {
      //       enabled: true
      //     },
      //   },
      // },
      tooltips: {
        enabled: false, // Disable the on-canvas tooltip
        intersect: false, // Prevent need for mouse to touch the line
        mode: 'index',
        custom: function(context) {
          // Tooltip Element
          var tooltipEl = document.getElementById('chartjs-tooltip');

          // Create element on first render
          if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.innerHTML = '<section></section>';
            document.body.appendChild(tooltipEl);
          }

          // Hide if no tooltip
          if (context.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
          }

          // Set caret Position
          tooltipEl.classList.remove('above', 'below', 'no-transform');
          if (context.yAlign) {
            tooltipEl.classList.add(context.yAlign);
          } else {
            tooltipEl.classList.add('no-transform');
          }

          // Set Text
          if(context.body) {
            let innerHtml = '';
            (context.title || []).forEach(function(title) {
                innerHtml += '<div class="title">' + frmt(moment(title, 'L')) + '</div>';
            });

            context.body.map(b => b.lines).forEach(function(body, i) {
              const val = body[0]
              if(dataView === '$') innerHtml += `<div class="value">$${formatMoney(val)}</div>`;
              if(dataView === '%') innerHtml += `<div class="value">${round(val, Math.abs(val) < 1 ? 2 : Math.abs(val) < 10 ? 1 : 0)}%</div>`;
            });

            tooltipEl.querySelector('section').innerHTML = innerHtml;
          }

          const canvas = document.getElementById('portfolio').querySelector('canvas');
          var position = {}
          if(canvas) position = canvas.getBoundingClientRect();

          // Display, position, and set styles for font
          tooltipEl.style.opacity = 1;
          tooltipEl.style.left = position.left + window.pageXOffset + context.caretX + 'px';
          tooltipEl.style.top = position.top + window.pageYOffset + context.caretY + 'px';
        }
      }
    }

    this.setState({
      chartData: chartData,
      chartOptions: chartOptions,
    })
  }

  render = () => {
    const { chartData, chartOptions } = this.state;

    return (
      <div className="tile-container" id="portfolio">
        <div className="tile">
          <div className="header">
            <div className="title">Portfolio</div>
          </div>
          <div className="body">
            <div className="chart-wrapper">
              {
                chartData && chartOptions &&
                <Line ref="chart" data={chartData} options={chartOptions} />
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
}