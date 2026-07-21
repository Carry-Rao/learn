# const 常量

`const` 关键字用于定义不可修改的变量。

```cpp
const double PI = 3.14159;
const int MAX_SIZE = 100;

PI = 3.14;  // 编译错误！常量不可修改
```

## const 与 #define

C 风格使用宏定义常量：

```cpp
#define PI 3.14159
```

C++ 推荐使用 `const`，因为：

- 有类型检查
- 有作用域
- 可以被调试器识别

## 示例

```cpp
#include <iostream>

int main() {
    const int STUDENTS = 30;
    const double TAX_RATE = 0.08;

    int total = STUDENTS * 100;
    double tax = total * TAX_RATE;

    std::cout << "Total: " << total << std::endl;
    std::cout << "Tax: " << tax << std::endl;
}
```
