import {v4 as uuid} from 'uuid'
import * as Crypto from 'crypto-js'

/**
 * 按Key排序Object
 * @param object
 * @param sortWith
 */
function sortObjectByKey(object, sortWith) {
  let keys
  let sortFn

  if (typeof sortWith === 'function') {
    sortFn = sortWith
  } else {
    keys = sortWith
  }
  return (keys || []).concat(Object.keys(object).sort(sortFn)).reduce(function (total, key) {
    total[key] = object[key]
    return total
  }, Object.create(null))
}

/**
 * POP URI编码
 * @param str
 * @returns {string}
 */
function encodePopURI(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%20/g, '+')
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

/**
 * 调POP接口，取回消息内容
 * @param url
 * @param body
 * @returns {Promise<any | never>}
 */
function fetchPopContent(url, body) {
  return fetch(url, {
    method: 'POST',
    body: body,
    credentials: 'omit',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
  }).then(res => res.json())
    .then((json) => {
      if (json.Code === 'OK') {
        return JSON.parse(json.Module)
      }
      const error = new Error(json.Message || '未知错误')
      error.code = json.Code
      throw error
    })
}

/**
 * 生成签名并发起请求
 *
 * @param accessKeyId string AccessKeyId (https://ak-console.aliyun.com/)
 * @param accessKeySecret string AccessKeySecret
 * @param domain string API接口所在域名
 * @param params array API具体参数
 * @param security boolean 使用https
 * @return bool|\stdClass 返回API接口调用结果，当发生错误时返回false
 */
export async function popRequest(
  accessKeyId,
  accessKeySecret,
  domain,
  params,
  security = true,
) {
  const method = 'POST'
  const apiParams = sortObjectByKey(
    Object.assign({
      'SignatureMethod': 'HMAC-SHA1',
      'SignatureNonce': uuid().replace(/-/g,''),
      'SignatureVersion': '1.0',
      'AccessKeyId': accessKeyId,
      'Timestamp': new Date().toISOString().replace(/\.\d+Z$/g, 'Z'),
      'Format': 'JSON',
    }, params))

  let sortedQueryStringTmp = Object.keys(apiParams).reduce((result, key) => {
    const value = apiParams[key]
    return `${result}&${encodePopURI(key)}=${encodePopURI(value)}`
  }, '').substr(1)

  const stringToSign = `${method}&%2F&${encodePopURI(sortedQueryStringTmp)}`

  const sign = Crypto.HmacSHA1(stringToSign, `${accessKeySecret}&`).toString(Crypto.enc.Base64)
  // const sign = base64_encode(hash_hmac("sha1", stringToSign, `${accessKeySecret}&`, true));

  const signature = encodePopURI(sign)

  const url = `${(security ? 'https' : 'http')}://${domain}/`

  return fetchPopContent(url, `${sortedQueryStringTmp}&Signature=${signature}`)
}

/**
 * 取RtcToken，请注意，此函数实现的是服务端使用AK/SK换取Token的功能，在实际业务中请通过服务端获取。
 * 服务端SDK接入请访问：https://api.aliyun.com/#/?product=Dyvmsapi&api=GetRtcToken
 * @param accessKeyId
 * @param accessKeySecret
 * @param userId
 * @param deviceId
 * @returns {Promise<boolean|object>}
 */
export default async function getRtcToken(accessKeyId, accessKeySecret, userId, deviceId) {
  return popRequest(
    accessKeyId,
    accessKeySecret,
    'dyvmsapi.aliyuncs.com',
    {
      "UserId": userId,
      "DeviceId": deviceId,
      "IsCustomAccount": "false",
      "Action": "GetRtcToken",
      "RegionId": "cn-hangzhou",
      "Version": "2017-05-25",
    },
    true
  )
}

