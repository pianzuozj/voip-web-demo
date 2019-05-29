import React, { Component } from "react";
import classNames from "classnames";
import styles from "./index.module.less";
import Icon from "../Icon";

export default class Button extends Component {
  render() {
    const {
      title,
      children,
      round,
      disabled,
      selected,
      loading,
      type = "normal",
      icon,
      ...props
    } = this.props;
    const className = classNames(
      styles.tinyButton,
      styles[`tinyButton-${type}`],
      props.className,
      { [styles.tinyButtonRound]: round },
      { [styles.tinyButtonDisabled]: disabled },
      { [styles.tinyButtonSelected]: selected },
      { [styles.tinyButtonLoading]: loading }
    );
    return (
      <button
        {...props}
        disabled={disabled}
        className={className}
        onClick={this.onClick}
      >
        {(loading || icon) && <Icon type={loading ? "loading" : icon} />}
        {title || children}
      </button>
    );
  }

  onClick = e => {
    const { onClick, disabled, loading } = this.props;
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
    e.preventDefault();
  };
}
