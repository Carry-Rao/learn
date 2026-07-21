# 函数

函数是 C++ 代码复用的基本单元。

## 定义与调用

```cpp
#include <iostream>

int add(int a, int b) {
    return a + b;
}

int main() {
    int result = add(3, 5);
    std::cout << "3 + 5 = " << result << std::endl;
}
```

## 函数结构

```
返回值类型 函数名(参数列表) {
    函数体
    return 返回值;
}
```

- 无返回值用 `void`
- 无参数参数列表可空或写 `void`

## 函数声明

函数必须先声明后使用。可以把定义放在 `main` 之后，在前面声明：

```cpp
int add(int a, int b);  // 声明

int main() {
    std::cout << add(3, 5);
}

int add(int a, int b) {  // 定义
    return a + b;
}
```

## 值传递

C++ 默认按值传递，函数内修改参数不影响原变量：

```cpp
void increment(int x) {
    x++;  // 不影响外面的变量
}
```
