import React, { Component } from 'react';
import moment from 'moment';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
// https://github.com/abelheinsbroek/chartjs-plugin-crosshair
// import 'chartjs-plugin-crosshair';
import 'chartjs-plugin-style';
import { 
  formatMoney, 
  frmt, 
  round,
  constrain,
  getLatest,
  colorMap,
  getColorProperties,
  shouldUpdate,
} from '../utils';

require('./Portfolio.css');

export default class Portfolio extends Component {
  state = {};
  meta = {}

  componentWillMount = () => {
    this.calcData();
  }

  shouldComponentUpdate = shouldUpdate.bind(this, this)

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
    const { history, activeDates, data, dataView, mobile } = this.props;

    if(activeDates[0].isSame(activeDates[1])) return;
    // all dates (strings)
    const datesKeys = Object.keys(data).filter(key => key !== 'meta' && data[key]);
    // profit/loss type key 
    const valKey = dataView === '$' ? 'balance' : 'plPerc';
    // check if chart ends higher than it began
    const isGain = data[datesKeys[0]].adj.pl < data[datesKeys[datesKeys.length - 1]].adj.pl;
    // check if color should be positive or negative
    const color = isGain ? colorMap.conservative : colorMap.other,
          colorProps = getColorProperties(color);
    // calc min and max vals for chart
    let min = datesKeys.reduce((min, date) => Math.min(min, data[date].adj[valKey]), data[datesKeys[0]].adj[valKey]),
        max = datesKeys.reduce((max, date) => Math.max(max, data[date].adj[valKey]), data[datesKeys[0]].adj[valKey]);
    min = min - (Math.abs(max - min) / 10)
    max = max + (Math.abs(max - min) / 10);

    const chartData = {
      labels: datesKeys,
      datasets: [
        {
          outerGlowColor: colorProps.rgbStr(colorProps.r, colorProps.g, colorProps.b, .5),
          outerGlowWidth: 5,
          data: datesKeys.map(key => data[key].adj[valKey])
        }
      ]
    }

    let lineTension = 0.4,
        pointRadius = 1;
    if(datesKeys.length > 200) {
      lineTension = 0.25;
      pointRadius = 0;
    }
    if(datesKeys.length > 400) {
      lineTension = 0.01;
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      legend: false,
      elements: {
        line: {
          tension: lineTension,
          borderCapStyle: 'round',
          fill: false,
          borderColor: color,
          borderWidth: 3,
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: 'miter',
        },
        point: {
          radius: pointRadius,
          backgroundColor: 'white',
          borderColor: 'rgba(0,0,0,0)',
          hoverBorderColor: 'rgba(0,0,0,0)',
          hoverBackgroundColor: 'white',
        }
      },
      annotation: {
        annotations: [{
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y-axis-0',
          value: 0,
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 4,
          label: {
            enabled: true,
            content: '0'
            // format label: https://github.com/chartjs/chartjs-plugin-annotation
          }
        }]
      },
      layout: {
        padding: 10
      },
      scales: {
        yAxes: [{
          gridLines: {
            display: false,
            drawBorder: false,
          },
          ticks: { min, max },
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
            tooltipEl.classList.add('portfolio-tooltip')
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
          let position = {}
          if(canvas) position = canvas.getBoundingClientRect();

          // Display, position, and set styles for font
          tooltipEl.style.opacity = 1;
          let left, top;
          // normal screen, below and to the left
          if(!mobile && window.innerWidth > 767) {
            const offset = 25;
            left = (position.left || 0) + window.pageXOffset + context.caretX + offset;
            top = (position.top || 0) + window.pageYOffset + context.caretY + offset;
          }
          // mobile screen, above and centered
          else {
            const offset = 25;
            const tooltipRect = tooltipEl.getBoundingClientRect();
            top = (position.top || 0) - tooltipRect.height;
            if(!mobile && top < 70) top = position.top + position.height;
            left = constrain(
              (position.left || 0) + window.pageXOffset + context.caretX - (tooltipRect.width / 2),
              15,
              window.innerWidth - 15 - tooltipRect.width
            );
          }
          // do not let the tooltip overflow off the page

          tooltipEl.style.left = constrain(left, 15, window.innerWidth - 15) + 'px';
          tooltipEl.style.top = top + 'px';
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