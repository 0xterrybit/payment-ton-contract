// 导入必要的类型和配置
import { Config, CustomNetwork } from '@ton/blueprint';
import 'dotenv/config';

// 定义类型别名,用于CustomNetwork的type和version属性
type TypeKeyType = CustomNetwork['type'];
type VersionKeyType = CustomNetwork['version'];

// 检查输入是否为有效的网络类型
function isTypeKeyType(inpType: any): inpType is TypeKeyType {
    let res = (inpType === 'mainnet') || (inpType === 'testnet') || (inpType === 'custom') || (inpType === undefined)
    return res
}

// 检查输入是否为有效的版本类型
function isVerKeyType(inpType: any): inpType is VersionKeyType {
    let res = (inpType === 'v2') || (inpType === 'v4') || (inpType === undefined);
    return res
}

// 初始化网络配置变量
let network: CustomNetwork | undefined = undefined

// 如果环境变量中设置了ENDPOINT_URL
if (typeof process.env["ENDPOINT_URL"] !== "undefined") {

    // 获取环境变量中的网络类型、版本和密钥
    let eType = process.env["ENDPOINT_TYPE"]?.toLocaleLowerCase() ?? "mainnet"
    let eVer = process.env["ENDPOINT_VERSION"]?.toLocaleLowerCase() ?? "v4"
    let eKey = process.env["ENDPOINT_KEY"]

    // 验证网络类型和版本是否有效
    if (isTypeKeyType(eType) && isVerKeyType(eVer)) {
        let url = process.env["ENDPOINT_URL"]
        
        // 根据版本调整URL格式
        if ((eVer === "v2") && (url.slice(-1) !== "/")) {
            url += "/"
        }
        if ((eVer === "v4") && (url.slice(-1) === "/")) {
            url = url.slice(0, -1)
        }
        
        // 构建网络配置对象
        network = {
            endpoint: url,
            type: eType,
            version: eVer,
            key: eKey
        }
    }
}

// 输出网络配置信息
console.log('network:', network);

// 导出配置对象
export const config: Config = {
    network: 'mainnet'
};