import React, { Component } from 'react';
import { Spring } from 'react-spring';
import { TimingAnimation, Easing } from 'react-spring/dist/addons';

export default class DurationTrail extends Component {
  state = {
    startDelay: this.props.startDelay || 0,
    toStyle: this.props.to,
    fromStyle: this.props.from
  }

  componentWillReceiveProps = props => {
    // this.setState({
    //   toStyle: props.to,
    //   fromStyle: props.from,
    // })
  }

  reverse = () => {
    this.setState({
      toStyle: this.state.fromStyle,
      fromStyle: this.state.toStyle
    });
  }

  componentDidMount = () => {
    // setTimeout(() => this.setState({startDelay: 0}), this.state.startDelay)
  }

  render() {
    const { 
      children,  
      animationDelay,
      delay = 0, 
      expDelay,
      duration = 250, 
      keys, 
      onRest, 
      easing,
      startIndex = 0,
      boost = 2,
      ...props 
    } = this.props;
    const {
      startDelay,
      toStyle,
      fromStyle
    } = this.state;

    props.to = toStyle;
    props.from = fromStyle;

    const config = { duration };
    if(easing) config.easing = Easing[easing];

    let baseDelay = (animationDelay || startDelay);
    for(let x=1; x<startIndex; x++) baseDelay += (expDelay || delay) / ((x+1) * boost);
    return children.map((child, i) => {
      const index = startIndex + i;
      if(index) baseDelay += (expDelay || delay) / ((index+1) * boost);
      return (
        <Spring
          ref={ref => i === 0 && (this.ref = ref)}
          key={keys[i]}
          {...props}
          delay={baseDelay}
          onRest={i === children.length - 1 ? onRest : null}
          children={child}
          impl={TimingAnimation} 
          config={config}
        />
      )
    })
  }
}