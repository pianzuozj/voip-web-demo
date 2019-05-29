import React, { Component } from "react";
import classNames from "classnames";
import styles from "./index.module.less";

export default class Icon extends Component {
  render() {
    const { type, className, size = "normal", ...props } = this.props;
    return (
      <span
        className={classNames(
          styles.tinyIcon,
          styles[`tinyIcon_${size}`],
          "voip-iconfont",
          `voip-icon-${type}`,
          className
        )}
        {...props}
      />
    );
  }
}
