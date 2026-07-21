# lambda 表达式

C++11 引入 lambda，定义匿名函数对象。

## 语法

```
[capture](params) -> return_type { body }
```

## 示例

```cpp
#include <algorithm>
#include <vector>

int main() {
    auto add = [](int a, int b) { return a + b; };
    std::cout << add(3, 5);  // 8

    std::vector<int> v = {5, 2, 8, 1, 9};
    std::sort(v.begin(), v.end(), [](int a, int b) {
        return a > b;  // 降序
    });
}
```

## 捕获

```cpp
int factor = 2;

auto v1 = [factor](int x) { return x * factor; };     // 值捕获
auto v2 = [&factor](int x) { factor += x; };          // 引用捕获
auto v3 = [=](int x) { return x + factor; };          // 全部值捕获
auto v4 = [&](int x) { factor += x; };                // 全部引用捕获

// C++14 移动捕获
auto p = std::make_unique<int>(42);
auto consume = [p = std::move(p)] { return *p; };
```

## mutable

默认值捕获的变量在 lambda 内部不可修改。加 `mutable` 允许修改（不影响外部）：

```cpp
int count = 0;
auto counter = [count]() mutable { return ++count; };
std::cout << counter();  // 1
std::cout << counter();  // 2
std::cout << count;      // 0
```
