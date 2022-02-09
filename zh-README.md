# 基本介绍

这是一个NodeJS + MongoDB快速初始化一个RESTful API模板，模板配置一些有关安全和数据处理中间件

## 模板功能
* 使用 JWT 进行身份验证（使用电子邮件重置密码，需要自行配置邮箱参数）
* RESTful API 形式增删改查
* API 安全相关配置 (NoSQL Injections, XSS Attacks, http param pollution etc)

## 配置

需要添加 config/.env 配置文件 ，你可以按照同级目录下配置文件进行参考


## 安装依赖
安装开发依赖
``` console
npm install
```

全局安装 nodemon(可选)
``` console
npm install -g nodemon
```

添加测试数据
``` console
node seeder -i
```

删除测试数据
``` console
node seeder -d
```

## 运行项目
``` console
node run dev //没用安装nodemon，请使用node app.js
```

## 开源协议

This project is licensed under the MIT License
