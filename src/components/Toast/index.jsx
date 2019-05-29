import React, { Component } from "react";
import ReactDOM from "react-dom";
import classNames from "classnames";
import styles from "./index.module.less";
import Icon from "../Icon";

export default class Toast extends Component {
  state = {
    prepareClose: false
  };

  async prepareClose() {
    this.setState({
      prepareClose: true
    });
    return new Promise(resolve => {
      setTimeout(resolve, 300);
    });
  }

  render() {
    const { text, children, icon } = this.props;
    const { prepareClose } = this.state;
    return (
      <div
        className={classNames(styles.tinyToast, styles[`tinyToast_${icon}`], {
          [styles.tinyToastPrepareClose]: prepareClose
        })}
      >
        {icon && (
          <Icon type={icon} className={styles.tinyToastIcon} size="large" />
        )}
        {text || children}
      </div>
    );
  }
}

let container;
let timer;

const clearToastNode = () => {
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (container) {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    container = null;
  }
};

const appendToastNode = () => {
  container = document.createElement("div");
  document.body.appendChild(container);
};

Toast.show = function(props = {}) {
  const newProps = { ...props };

  if (!newProps.timeout) {
    newProps.timeout = 3000;
  }

  clearToastNode();
  appendToastNode();

  const inst = ReactDOM.render(<Toast {...newProps} />, container);

  timer = window.setTimeout(() => {
    if (inst) {
      inst.prepareClose().then(clearToastNode);
    } else {
      clearToastNode();
    }
  }, newProps.timeout);
};

const parseProps = (props, otherProps = {}) => {
  return typeof props === "string"
    ? { text: props, ...otherProps }
    : { ...props, ...otherProps };
};

Toast.success = props => Toast.show(parseProps(props, { icon: "success" }));
Toast.warning = props => Toast.show(parseProps(props, { icon: "warning" }));
Toast.error = props => Toast.show(parseProps(props, { icon: "error" }));
