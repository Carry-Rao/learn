# std::array

`std::array` 是固定大小的数组容器，兼具 C 数组的性能和 STL 容器的接口。

## 基本用法

```cpp
#include <array>

std::array<int, 5> arr = {1, 2, 3, 4, 5};

arr[0];              // 1（无越界检查）
arr.at(0);           // 1（抛异常越界检查）
arr.size();          // 5
arr.front();         // 1
arr.back();          // 5
arr.data();          // 底层 C 数组指针

for (int x : arr)
    std::cout << x;
```

## vs C 数组

```cpp
// C 数组
int old[5] = {1, 2, 3, 4, 5};
int size = sizeof(old) / sizeof(old[0]);  // 需要手动算
void func(int* p);                         // 退化为指针

// std::array（推荐）
std::array<int, 5> arr = {1, 2, 3, 4, 5};
arr.size();                                // 内建大小
void func(std::array<int, 5>& a);          // 保留大小信息
```

## vs vector

| | `array` | `vector` |
|--|---------|----------|
| 大小 | 编译期固定 | 运行时可变 |
| 分配位置 | 栈 | 堆（数据部分） |
| 性能 | 同 C 数组 | 有动态分配开销 |
| 用途 | 固定大小、栈上存储 | 动态大小 |

## 建议

- 编译期知道大小且元素不多 → `std::array`（栈分配）
- 需要动态调整大小 → `std::vector`
- `std::array` 比 C 数组更安全，优先使用
