# 迭代器

迭代器是 STL 中连接容器和算法的桥梁。

## 基本概念

迭代器类似指针，用于遍历容器元素。

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30, 40, 50};

    // begin/end
    for (auto it = v.begin(); it != v.end(); ++it) {
        std::cout << *it << " ";  // 解引用获取值
    }

    // 反向遍历
    for (auto it = v.rbegin(); it != v.rend(); ++it) {
        std::cout << *it << " ";  // 50 40 30 20 10
    }
}
```

## 迭代器类型

| 迭代器 | 功能 | 示例 |
|--------|------|------|
| 输入迭代器 | 只读，单向 | `std::istream_iterator` |
| 输出迭代器 | 只写，单向 | `std::ostream_iterator` |
| 前向迭代器 | 读写，单向 | `std::forward_list` |
| 双向迭代器 | 读写，双向 | `list`, `set`, `map` |
| 随机访问迭代器 | 读写，任意跳转 | `vector`, `deque`, `std::string` |

## 用迭代器修改元素

```cpp
for (auto it = v.begin(); it != v.end(); ++it) {
    *it *= 2;  // 翻倍
}
```

## const 迭代器

```cpp
auto it = v.cbegin();  // const_iterator，不能修改元素
```

## 迭代器失效

在遍历过程中如果修改容器（如 `push_back`、`erase`），迭代器可能失效：

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};
for (auto it = v.begin(); it != v.end(); ) {
    if (*it % 2 == 0) {
        it = v.erase(it);  // erase 返回下一个有效迭代器
    } else {
        ++it;
    }
}
```
