import React from "react";
import styles from "./index.module.less";
import Header from "./modules/Header";
import Body from "./modules/Body";

export default () => (
  <div className={styles.controlPanel}>
    <div className={styles.controlDemo}>
      <Header />
      <Body />
    </div>
  </div>
);
