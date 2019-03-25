# 融合通信 VoIP Web SDK Demo.

## 接入前准备

客户端需要从阿里云申请融合通信账号后才能接入，为了保证安全性，融合通信SDK通过服务端下发的临时token作为身份标识与服务进行交互。临时token可通过融合通信服务pop接口从阿里云获得（详见服务端接入文档），并且具有时效性。SDK在token即将失效或其他需求而需要更新token时，会通过回调通知接入方，接入方需自行实现接口获取最新token并传递给SDK。推荐的交互流程如下：

![推荐接入流程](http://docs-aliyun.cn-hangzhou.oss.aliyun-inc.com/assets/pic/111505/cn_zh/1553053168482/WebSDK%E4%BA%A4%E4%BA%92%E6%B5%81%E7%A8%8B.jpg)

VoIP Web SDK请参考[融合通信VoIP Web SDK 官方文档](https://help.aliyun.com/document_detail/111505.html)

## 安装体验Demo

体验Demo是使用社区开源产品CreateReactAPP，定位工程目录，先安装依赖

```sh
$ # 使用npm安装
$ npm install

$ # 使用cnpm安装
$ cnpm install

$ # 使用yarn安装
$ yarn install
```

再使用：`npm start`以开发模式启动Demo工程。

在浏览器中打开 [http://localhost:3000](http://localhost:3000)查看Demo。

当编辑源码时，页面将会刷新，并可能在控制台中看到一些代码检查问题(lint errors)。

## 关键目录结构

```
\_App.jsx 应用入口组件，包含所有SDK的调用实现
\_components/ 应用中所使用到的轻量级包装组件
\_ControlPanel/ 登录及拔号组件
\_StatusBar/ 吸顶通话状态条
```
