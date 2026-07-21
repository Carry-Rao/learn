# STL 算法

`<algorithm>` 头文件提供大量通用算法，通过迭代器与容器解耦。

## 常用算法

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> v = {5, 2, 8, 1, 9};

    // 排序
    std::sort(v.begin(), v.end());

    // 反转
    std::reverse(v.begin(), v.end());

    // 查找
    auto it = std::find(v.begin(), v.end(), 8);
    if (it != v.end()) {
        std::cout << "Found: " << *it << std::endl;
    }

    // 计数
    int count = std::count(v.begin(), v.end(), 5);

    // 最大值/最小值
    auto max = std::max_element(v.begin(), v.end());
    auto min = std::min_element(v.begin(), v.end());

    // 二分查找（需已排序）
    bool exists = std::binary_search(v.begin(), v.end(), 5);

    // 删除特定元素（erase-remove 惯用法）
    v.erase(std::remove(v.begin(), v.end(), 2), v.end());

    // 遍历执行操作
    std::for_each(v.begin(), v.end(), [](int x) {
        std::cout << x << " ";
    });
}
```

## 算法分类

| 类别 | 算法 |
|------|------|
| 排序 | `sort`, `stable_sort`, `partial_sort`, `nth_element` |
| 查找 | `find`, `find_if`, `binary_search`, `lower_bound`, `upper_bound` |
| 修改 | `copy`, `fill`, `replace`, `remove`, `reverse`, `transform` |
| 数值 | `count`, `accumulate`（需 `<numeric>`），`partial_sum` |
| 集合 | `set_union`, `set_intersection`, `set_difference` |
| 极值 | `max`, `min`, `max_element`, `min_element` |

## 原理：std::sort 的实现（intro sort）

`std::sort` 平均 O(n log n)，通常使用 **intro sort**（内省排序）：

1. 元素少时用插入排序（O(n²) 但常数极小）
2. 递归深度超限时改用堆排序（保证最坏 O(n log n)）
3. 否则用快速排序（取三点中值作 pivot）

```cpp
// 简化示意
template <typename Iter>
void sort(Iter first, Iter last) {
    if (last - first <= 16) {
        insertion_sort(first, last);    // 小规模用插入排序
        return;
    }
    if (递归深度超限) {
        heapsort(first, last);          // 防止退化
        return;
    }
    auto pivot = median_of_three(first, last);
    auto mid = partition(first, last, pivot);
    sort(first, mid);
    sort(mid, last);
}
```

## erase-remove 惯用法

算法只移动元素，不改变容器大小：

```cpp
std::vector<int> v = {1, 2, 3, 2, 4, 2};

// remove 把不等于 2 的元素移到前方，返回新 logical end
auto new_end = std::remove(v.begin(), v.end(), 2);
// v = {1, 3, 4, ?, ?, ?}

v.erase(new_end, v.end());
// v = {1, 3, 4}

// 一行版
v.erase(std::remove(v.begin(), v.end(), 2), v.end());
```

## 算法复杂度

| 算法 | 复杂度 |
|------|--------|
| `sort` | O(n log n) |
| `stable_sort` | O(n log n)（额外内存） |
| `partial_sort` / `nth_element` | O(n) |
| `find` / `count` | O(n) |
| `binary_search` / `lower_bound` | O(log n) |
| `reverse` | O(n) |
| `unique` | O(n) |

## 建议

- STL 算法已高度优化，优先使用而非手写循环
- `erase-remove` 是删除元素的惯用法
- `lower_bound`/`upper_bound` 在已排序区间查找比 `find` 快得多
- `<numeric>` 的 `accumulate` / `partial_sum` 也很常用
