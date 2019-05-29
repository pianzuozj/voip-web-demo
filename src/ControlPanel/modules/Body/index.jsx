import React, { Component } from "react";
import styles from "./index.module.less";
import Account from "./Account";
import CalleeInfo from "./CalleeInfo";
import { SessionConsumer } from "../../../SessionContext";
import MissedCallList from "./MissedCallList";

class Body extends Component {
  render() {
    return (
      <SessionConsumer>
        {({
          login,
          logout,
          serviceState,
          missedList,
          callState,
          startCall,
          serviceError,
          retry,
          mediaEnabled
        } = {}) => (
          <div className={styles.demoBody}>
            <Account
              serviceState={serviceState}
              login={login}
              logout={logout}
              serviceError={serviceError}
              retry={retry}
              mediaEnabled={mediaEnabled}
            />
            <div className={styles.demoRight}>
              <CalleeInfo
                serviceState={serviceState}
                callState={callState}
                startCall={startCall}
              />
              <MissedCallList list={missedList} />
            </div>
          </div>
        )}
      </SessionConsumer>
    );
  }
}

export default Body;
