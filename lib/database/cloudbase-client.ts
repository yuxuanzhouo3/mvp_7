/**
 * 腾讯云 CloudBase 数据库客户端
 * 用于官网国内IP用户的数据存储
 */

import cloudbase from '@cloudbase/js-sdk'

// 延迟初始化，避免SSR错误
let app: any = null
let db: any = null
let auth: any = null
let MySQLdb: any = null

// 检查是否在服务器端运行
const isServer = typeof window === 'undefined';

// 初始化函数（支持SSR）
async function initCloudBase() {
    console.log('[国内用户] 使用腾讯云CloudBase数据库，开始初始化')
    if (app) return {app, db, auth} // 已初始化

    // 检查是否在服务器端运行
    if (isServer) {
        // 服务器端使用 Node.js SDK
        try {
            const cloudbaseNode = await import('@cloudbase/node-sdk')
            
            const envId = process.env.NEXT_PUBLIC_WECHAT_CLOUDBASE_ID
            const secretId = process.env.CLOUDBASE_SECRET_ID
            const secretKey = process.env.CLOUDBASE_SECRET_KEY
            
            if (!envId || !secretId || !secretKey) {
                console.warn('❌ [CloudBase Client] 服务器端缺少必要的环境变量')
                return { app: null, db: null, auth: null }
            }
            
            app = cloudbaseNode.default.init({
                env: envId,
                secretId,
                secretKey,
                region: 'ap-shanghai',
            })
        } catch (error) {
            console.error('❌ [CloudBase Client] 服务器端 SDK 加载失败:', error)
            return { app: null, db: null, auth: null }
        }
    } else {
        // 客户端使用浏览器 SDK
        const envId = process.env.NEXT_PUBLIC_WECHAT_CLOUDBASE_ID || ''
        const accessKey = process.env.VITE_CLOUDBASE_ACCESS_KEY || ''
        
        if (!envId) {
            console.error('❌ [CloudBase Client] 客户端缺少 NEXT_PUBLIC_WECHAT_CLOUDBASE_ID 环境变量')
            return { app: null, db: null, auth: null }
        }
        
        try {
            app = cloudbase.init({
                env: envId,
                region: 'ap-shanghai',
                accessKey,
            })
        } catch (error) {
            console.error('❌ [CloudBase Client] 客户端 SDK 初始化失败:', error)
            return { app: null, db: null, auth: null }
        }
    }

    try {
        auth = app.auth()
        db = app.database()
        MySQLdb = app.rdb()

        console.log('✅ [CloudBase] 初始化成功:', process.env.NEXT_PUBLIC_WECHAT_CLOUDBASE_ID)
    } catch (error) {
        console.error('❌ [CloudBase] 获取数据库实例失败:', error)
        return { app: null, db: null, auth: null }
    }

    return {app, db, MySQLdb, auth}
}

// 注意：不再在模块级别立即初始化，避免SSR错误

// 导出实例
export { db, auth, MySQLdb }
export default app

// 辅助函数：获取集合引用
export async function getCollection(collectionName: string) {
    if (!db) {
        await initCloudBase()
    }
    return db?.collection(collectionName)
}


// const app2 = cloudbase.init({ env: 'cloud1-5gj85cdkf02743ad', region: 'ap-shanghai' })


// 官网专用集合名称（带web_前缀）
export const COLLECTIONS = {
    USERS: 'web_users',
    FAVORITES: 'web_favorites',
    CUSTOM_SITES: 'web_custom_sites',
    SUBSCRIPTIONS: 'web_subscriptions',
    PAYMENT_TRANSACTIONS: 'web_payment_transactions'
}
