# 变量与基本类型

C++ 是静态类型语言，变量必须先声明类型再使用。

## 基本数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `int` | 整型 | `int age = 18;` |
| `double` | 双精度浮点 | `double pi = 3.14159;` |
| `float` | 单精度浮点 | `float f = 1.5f;` |
| `char` | 字符 | `char c = 'A';` |
| `bool` | 布尔值 | `bool flag = true;` |

## 变量声明与初始化

```cpp
int a;            // 声明，未初始化（值不确定）
int b = 10;       // 拷贝初始化
int c(20);        // 直接初始化
int d{30};        // 列表初始化（C++11 推荐）
```

## 示例

```cpp
#include <iostream>

int main() {
    int age = 20;
    double price = 99.5;
    char grade = 'A';
    bool passed = true;

    std::cout << "Age: " << age << std::endl;
    std::cout << "Price: " << price << std::endl;
    std::cout << "Grade: " << grade << std::endl;
    std::cout << "Passed: " << passed << std::endl;
}
```

## 命名规范

- 变量名由字母、数字、下划线组成，不能以数字开头
- 推荐使用驼峰命名法或下划线命名法：`studentAge` 或 `student_age`
- 区分大小写
