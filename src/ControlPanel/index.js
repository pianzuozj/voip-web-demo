import React, { Component } from 'react';
import styles from './index.module.less';
import Header from './modules/Header';
import Body from './modules/Body';

class ControlPanel extends Component {
  render() {
    return (
      <div className={styles.controlPanel}>
        <div className={styles.controlDemo}>
          <Header />
          <Body />
        </div>
      </div>
    );
  }
}

export default ControlPanel;
