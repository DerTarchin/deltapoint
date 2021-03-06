import React, { Component } from 'react';
import { isEnter, isBackspace, isNull } from '../utils';

const DATA_MAX = 49;
const noop = () => {};

export default class ContentEditable extends Component {
  state = {
    html: isNull(this.props.defaultHtml) ? this.props.html : this.props.defaultHtml,
  }

  componentDidUpdate = prevProps => {
    const { html } = this.props;
    if(prevProps.html !== html && typeof html === 'string' && html !== this.state.html) {
      this.setState({ html });
    }
  }

  clearContent = () => {
    this.refs.contentEditable.innerHTML = '';
    this.setState({ html: ' ' }, () => this.setState({ html: '' }));
  }

  focus = () => {
    this.refs.contentEditable.focus();
    setTimeout(() => this.refs.contentEditable.focus(), 20);
  }

  focusToEnd = () => {
    let range, selection;
    if(document.createRange) { //Firefox, Chrome, Opera, Safari, IE 9+
      range = document.createRange(); //Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(this.el()); //Select the entire contents of the element with the range
      range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
      selection = window.getSelection(); //get the selection object (allows you to change selection)
      selection.removeAllRanges(); //remove any selections already made
      selection.addRange(range); //make the range you have just created the visible selection
    } else if(document.selection) { //IE 8 and lower
      range = document.body.createTextRange(); //Create a range (a range is a like the selection but invisible)
      range.moveToElementText(this.el()); //Select the entire contents of the element with the range
      range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
      range.select(); //Select the range (make it the visible selection
    }
  }

  selectAll = () => {
    const div = this.refs.contentEditable;
    window.setTimeout(() => {
      if(!div) return;
      let sel, range;
      if (window.getSelection && document.createRange) {
        range = document.createRange();
        range.selectNodeContents(div);
        sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(div);
        range.select();
      }
    }, 1);
  }

  el = () => this.refs.contentEditable
  text = () => this.refs.contentEditable.innerText ||  this.refs.contentEditable.textContent
  clear = () => this.clearContent()
  
  setText = (html, callback) => {
    if(this.state.html !== html) this.setState({ html }, callback);
    else if(callback) callback();
  }

  onInput = e => {
    e.persist();
    const { 
      allowNewLine,
      disableEnter,
      onInput,
      onKeyUp,
      onKeyPress
    } = this.props;
    const html = e.target.innerText || e.target.textContent;
    if(!allowNewLine && isEnter(e)) {
      e.preventDefault();
      if(!disableEnter) e.target.blur();
      this.setState({ html }, () => (onInput || onKeyUp || onKeyPress || noop)(e, html));
    }
    else (onInput || onKeyUp || onKeyPress || noop)(e, html);
  }

  render = () => {
    const { props } = this;
    const normalized = {}, 
          blacklist = [
            'allowNewLine',
            'disableMax',
            'whitelist',
            'onInput',
            'onKeyUp',
            'onBlur',
            'html',
            'noPaste',
            'onKeyPress',
            'defaultHtml',
            'disableEnter',
            'placeholder',
            'tag'
          ];
    for(let prop in props) if(!blacklist.includes(prop)) normalized[prop] = props[prop];

    const TagProps = {
      ...normalized,
      ref: 'contentEditable',
      'data-placeholder': props.placeholder || props['data-placeholder'],
      contentEditable: true,
      suppressContentEditableWarning: true,
      dangerouslySetInnerHTML: {__html: this.state.html},
      onInput: props.onInput ? this.onInput : null,
      onKeyUp: props.onKeyUp ? this.onInput : null,
      onBlur: e => {
        e.persist();
        const html = e.target.innerText || e.target.textContent;
        this.setState({html});
        (props.onBlur || noop)(e, html);
      },
      onPaste: e => {
        e.persist();
        if(props.noPaste) e.preventDefault();
        (props.onPaste || noop)(e);
        setTimeout(() => {
          let html = this.text(), 
              max = props['data-max'] || DATA_MAX;
          if(!props.disableMax && html.length > max) {
            html = html.substring(0, max);
            this.setState({ html });
          }
          (props.onInput || props.onKeyPress || noop)(e, html);
        }, 1)
      },
      onKeyPress: e => {
        e.persist();
        const html = e.target.innerText || e.target.textContent;
        if(props.whitelist && e.key && !props.whitelist.includes(e.key.toLowerCase())) e.preventDefault();
        if(!props.allowNewLine && isEnter(e)) {
          e.preventDefault();
          if(!props.disableEnter) e.target.blur();
        }
        if(!props.disableMax && html.length > (props['data-max'] || DATA_MAX) && !isBackspace(e)) return e.preventDefault();
        if(props.onInput || props.onKeyUp) (props.onKeyPress || noop)(e, html);
      },
    }

    if(props.tag === 'span') return <span {...TagProps} />;
    return <div {...TagProps} />;
  }
}
