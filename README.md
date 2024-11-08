# TON和Jetton Pay 合约

## 合约描述

###  Pay 合约
- **接收TON**: 合约可以接收TON代币。
- ** Pay TON**: 一个函数,可以在单个交易中将指定数量的TON Pay 给多个地址。 Pay 可以是固定金额或百分比。
- ** Pay Jettons**: 一个函数,可以将指定数量的Jettons Pay 给多个地址。 Pay 可以是固定金额或百分比。

### API要求
- **触发 Pay **: 一个触发TON Pay 的API端点。
- **接受JSON负载**: API接受包含要 Pay 的地址列表和金额的JSON负载。

## 已部署的合约

- **TON测试网合约**: [点击这里](https://testnet.tonviewer.com/kQCbVMWAMeUXQzW-ANL7X794p8EYcmNedACqXL4bMBSzR-Jr)

### 成功交易的URL: [点击这里](https://testnet.tonviewer.com/transaction/992653b538d12992f495099a6be88b1c451ba3e378980f085b215a6987687dcc)


## 使用说明

### 1. 克隆仓库
```bash
git clone https://github.com/0xterrybit/ton_payment.git
```

### 2. 安装依赖
```bash
npm install
```

### 3. 运行测试
```bash
npm run test
```

### 4. 运行测试


### 5. 执行脚本
运行脚本以执行 Pay :
```bash
npm run start
```
