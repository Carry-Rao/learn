# lambda 表达式

C++11 引入 lambda，允许定义匿名函数。

## 基本语法

```cpp
[capture](parameters) -> return_type { body }
```

## 示例

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    // 基本 lambda
    auto add = [](int a, int b) { return a + b; };
    std::cout << add(3, 5);  // 8

    // 带返回类型
    auto div = [](double a, double b) -> double {
        return a / b;
    };

    // 与算法结合
    std::vector<int> v = {5, 2, 8, 1, 9};

    std::sort(v.begin(), v.end(), [](int a, int b) {
        return a > b;  // 降序
    });

    // 查找偶数
    auto it = std::find_if(v.begin(), v.end(), [](int x) {
        return x % 2 == 0;
    });
}
```

## 捕获

```cpp
int factor = 2;

auto multiply = [factor](int x) { return x * factor; };  // 值捕获
auto modify = [&factor](int x) { factor += x; };         // 引用捕获
auto all_copy = [=](int x) { return x + factor; };       // 全部值捕获（C++14 前常用）
auto all_ref  = [&](int x) { factor += x; };             // 全部引用捕获

// C++14 起支持移动捕获
auto p = std::make_unique<int>(42);
auto consume = [p = std::move(p)] { return *p; };
```

## mutable

值捕获的变量默认不可修改，加 `mutable` 可修改（不影响原变量）：

```cpp
int count = 0;
auto counter = [count]() mutable { return ++count; };
std::cout << counter();  // 1
std::cout << counter();  // 2
std::cout << count;      // 0（原变量不受影响）
```
