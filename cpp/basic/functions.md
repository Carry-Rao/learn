# 函数基础

函数是 C++ 代码组织的基本单元。

## 函数定义

```cpp
#include <iostream>

int add(int a, int b) {
    return a + b;
}

int main() {
    int result = add(3, 5);
    std::cout << "3 + 5 = " << result << std::endl;
    return 0;
}
```

## 函数重载

C++ 支持函数重载，同名函数可以有不同的参数：

```cpp
int max(int a, int b) {
    return a > b ? a : b;
}

double max(double a, double b) {
    return a > b ? a : b;
}
```
