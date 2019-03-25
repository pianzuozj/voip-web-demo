import React, { Component } from 'react'
import classNames from 'classnames'
import styles from './index.module.less'

export default class DebugPanel extends Component {
  render() {
    const { value = {}, className, ...props } = this.props
    return (
      <ul className={classNames(styles.debugPanel, className)} {...props}>
        {Object.keys(value).map((key) => {
          let valueString = String(typeof value[key] === 'string' ? value[key] : JSON.stringify(value[key], 0, 2))
          const rows = valueString.split(/\n/g)
          return <li key={key}>
            <span className={styles.label}>{key}</span>
            <div className={styles.value}>
              {rows.map((line, j)=>(
                <div key={`${key}.${j}`}><span>{line}</span></div>
              ))}
            </div>
          </li>
        })}
      </ul>
    )
  }
}
