import React, { Component } from 'react'
import classNames from 'classnames'
import styles from './index.module.less'

export default class Input extends Component {
  state = {
    value: this.props.defaultValue || this.props.value,
  }

  render() {
    const { children, secret, disabled, defaultValue, value, ...props } = this.props
    const className = classNames(
      styles.tinyInput,
      props.className,
      {[styles.tinyInputDisabled]: disabled},
    )
    return (
      <input
        {...props}
        disabled={disabled}
        className={className}
        onChange={this.onChange}
        value={this.state.value}
        type={!secret ? 'text' : 'password'}
      />)
  }

  onChange = (e) => {
    const { onChange } = this.props
    if (onChange) {
      this.setState({
        value: e.target.value
      })
      onChange(e)
    }
  }
}
