# vector

`std::vector` 是动态数组，长度可自动扩展。

## 基本用法

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;

    v.push_back(10);
    v.push_back(20);
    v.push_back(30);

    std::cout << "Size: " << v.size() << std::endl;     // 3
    std::cout << "First: " << v[0] << std::endl;        // 10
    std::cout << "Last: " << v.back() << std::endl;      // 30

    // 遍历
    for (int i = 0; i < v.size(); i++) {
        std::cout << v[i] << " ";
    }

    // 范围 for（C++11）
    for (int x : v) {
        std::cout << x << " ";
    }
}
```

## 常用操作

```cpp
std::vector<int> v;

v.push_back(x);     // 末尾添加
v.pop_back();       // 删除末尾
v.size();           // 元素个数
v.empty();          // 是否为空
v.clear();          // 清空
v.front();          // 第一个元素
v.back();           // 最后一个元素
v.at(i);            // 带越界检查的访问
v.resize(n);        // 重新设置大小
```

## 初始化

```cpp
std::vector<int> v1;                 // 空
std::vector<int> v2(5);              // 5 个 0
std::vector<int> v3(5, 10);          // 5 个 10
std::vector<int> v4 = {1, 2, 3};     // 列表初始化（C++11）
```

## 二维 vector

```cpp
std::vector<std::vector<int>> matrix(3, std::vector<int>(4, 0));
```
