# 字符串

C++ 提供 `std::string` 类型处理字符串。

## 基本用法

```cpp
#include <iostream>
#include <string>

int main() {
    std::string s1 = "Hello";
    std::string s2 = "World";

    std::string s3 = s1 + " " + s2;  // 拼接
    std::cout << s3 << std::endl;          // Hello World

    std::cout << s3.length() << std::endl; // 11
    std::cout << s3[0] << std::endl;       // H

}
```

## 常用操作

```cpp
std::string s = "C++ Programming";

s.length()          // 长度（不含 \0）
s.empty()           // 是否为空
s[0]                // 访问字符
s.front()           // 第一个字符
s.back()            // 最后一个字符

s.find("C++")       // 查找子串位置，返回 size_t
s.find("Java")      // 未找到返回 std::string::npos

s.substr(4, 3)      // 从位置 4 取 3 个字符
s.append("!")       // 追加

s.compare("C++")    // 比较，返回 0 表示相等
s == "C++"          // 可直接用 == 比较
```

## 示例：判断子串

```cpp
std::string url = "https://example.com";
if (url.find("https://") == 0) {
    std::cout << "Secure connection";
}
```
