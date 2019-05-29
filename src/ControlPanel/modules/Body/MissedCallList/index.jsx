import React from "react";
import styles from "./index.module.less";

const stateTextMapping = {
  BUSY: "忙线",
  TIMEOUT: "超时"
};

const MissedCallList = ({ list = [] }) =>
  list.length > 0 ? (
    <section className={styles.missedCallList}>
      <h1>漏接来电记录</h1>
      <ul>
        {list.map(({ time, number, state }, i) => (
          <li key={i}>
            <span className={styles.time}>{time}</span>
            <span className={styles.desc}>{number} 来电未接听</span>
            <span className={styles.state}> - {stateTextMapping[state]}</span>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

export default MissedCallList;
