import React, { Component } from 'react';
import moment from 'moment';
import { Line } from 'react-chartjs-2';
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

  componentDidMount = () => {
    // this.registerVerticalLineInstance();
  }

  componentDidUpdate = prevProps => {
    // check if data changed
    let dataChanged = false;
    if(prevProps.data !== this.props.data) dataChanged = true;
    if(prevProps.dataView !== this.props.dataView) dataChanged = true;
    if(prevProps.feeAdjustments !== this.props.feeAdjustments) dataChanged = true;
    if(prevProps.contributionAdjustments !== this.props.contributionAdjustments) dataChanged = true;
    if(dataChanged) this.calcData();
    // this.registerVerticalLineInstance();
  }

  registerVerticalLineInstance = () => {
    if(!this.refs.chart || this.meta.registeredInstance) return;
    const instance = this.refs.chart.chartInstance;
    this.meta.registeredInstance = true;
    // console.log(instance)
    instance.pluginService.register({
      id: 'threshold',
      afterDraw: (chart, easing) => {
        if (typeof chart.chart.config.data.datasets[0].install != 'undefined') {
          if (chart.chart.config.data.datasets[0].install != '-1') {
            var meta = chart.getDatasetMeta(0);
            var x = meta.data[chart.chart.config.data.datasets[0].install]._model.x;
            chart.chart.ctx.restore();
            chart.chart.ctx.beginPath();
            chart.chart.ctx.setLineDash([5, 5]);
            chart.chart.ctx.strokeStyle = '#000000';
            chart.chart.ctx.moveTo(x, 0);
            chart.chart.ctx.lineTo(x, 10000);
            chart.chart.ctx.stroke();
          }
        }
      }
    });
  }

  calcData = () => {
    const { history, activeDates, data, dataView } = this.props;

    const isSingleDate = activeDates[0].isSame(activeDates[1]);
    const filter = key => key !== 'meta' && data[key];
    // console.log(this.props, isSingleDate)
    if(isSingleDate) return;
    const chartData = {
      labels: Object.keys(data).filter(filter),
      datasets: [
        {
          fill: false,
          // lineTension: 0.5,
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          borderCapStyle: 'butt',
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: 'miter',
          pointBorderColor: 'rgba(75,192,192,1)',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'rgba(75,192,192,1)',
          pointHoverBorderColor: 'rgba(220,220,220,1)',
          pointHoverBorderWidth: 2,
          pointRadius: 1,
          pointHitRadius: 10,
          data: Object.keys(data).filter(filter).map(key => {
            if(dataView === '$') return data[key].adj.balance;
            if(dataView === '%') return data[key].adj.plPerc;
          }),
        }
      ]
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      legend: false,
      layout: {
        padding: 10,
      },
      scales: {
        yAxes: [{
          gridLines: {
            display: false,
            drawBorder: false,
          },
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
      tooltips: {
        // Disable the on-canvas tooltip
        enabled: false,
        mode: 'index',
        intersect: false,
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

          function getBody(bodyItem) {
            return bodyItem.lines;
          }

          // Set Text
          if(context.body) {
            let innerHtml = '';
            (context.title || []).forEach(function(title) {
                innerHtml += '<div class="title">' + frmt(moment(title, 'L')) + '</div>';
            });

            context.body.map(getBody).forEach(function(body, i) {
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

    const newState = {
      chartData: chartData,
      chartOptions: chartOptions,
    };
    if(!isSingleDate) newState.dates = activeDates;
    this.setState(newState)
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