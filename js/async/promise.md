# Promise 入门

Promise 是 JavaScript 异步编程的现代解决方案。

## 基本用法

```javascript
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve("操作成功");
    }, 1000);
});

promise.then(result => {
    console.log(result); // 1秒后输出: 操作成功
});
```

## 链式调用

```javascript
fetch("https://api.example.com/data")
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error("请求失败:", error));
```

## async/await

```javascript
async function getData() {
    try {
        const response = await fetch("https://api.example.com/data");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("请求失败:", error);
    }
}
```
