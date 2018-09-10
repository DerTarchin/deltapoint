import React, { Component } from 'react';

const IS_ENTER = e => (e.key || e.keyCode) === 'Enter' || e.which === 13;

export default class ContentEditable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      static_html: this.props.html,
    };
  }

  componentWillReceiveProps(props) {
    if(typeof props.html === 'string' && props.html !== this.state.static_html) {
      this.setState({ static_html: props.html });
    }
  }

  clearContent() {
    this.setState({ static_html: ' ' }, () => this.setState({ static_html: '' }));
  }

  focus() {
    this.refs.contentEditable.focus();
    setTimeout(() => this.refs.contentEditable.focus(), 20);
  }

  render() {
    const noop = () => {};
    const props = this.props;
    const normalized = {}, 
          blacklist = [
            'allowEnter',
            'disableMax',
            'onInput',
            'onKeyUp',
            'onBlur',
            'onKeyPress',
            'html'
          ];
    for(let prop in props) if(!blacklist.includes(prop)) normalized[prop] = props[prop];
    return (
      <div
        {...normalized}
        ref="contentEditable"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{__html: this.state.static_html}}
        onInput={e => (props.onInput || noop)(e, e.target.textContent)}
        onBlur={e => {
          const static_html = e.target.textContent;
          this.setState({static_html});
          (props.onBlur || noop)(e, static_html);
        }}
        onKeyPress={e => {
          e.persist();
          const static_html = e.target.textContent;
          if(!props.allowEnter && IS_ENTER(e)) {
            e.preventDefault();
            this.setState({static_html}, () => (props.onKeyPress || noop)(e, static_html));
            e.target.blur();
          }
          else {
            if(!props.disableMax && static_html.length > (props['data-max'] || 49)) return e.preventDefault();
            (props.onKeyPress || noop)(e, static_html);
          }
        }}
      />
    );
  }
}