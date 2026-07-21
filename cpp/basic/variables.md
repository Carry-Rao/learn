# 变量与数据类型

C++ 是一种**静态类型**语言，变量在使用前必须声明类型。

## 基本数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `int` | 整型 | `int age = 18;` |
| `double` | 双精度浮点 | `double pi = 3.14;` |
| `char` | 字符 | `char c = 'A';` |
| `bool` | 布尔 | `bool ok = true;` |
| `std::string` | 字符串 | `std::string name = "C++";` |

## 变量声明

```cpp
#include <iostream>
#include <string>

int main() {
    int age = 20;
    double price = 99.9;
    char grade = 'A';
    bool isPass = true;
    std::string name = "Alice";

    std::cout << name << " is " << age << " years old." << std::endl;
    return 0;
}
```
