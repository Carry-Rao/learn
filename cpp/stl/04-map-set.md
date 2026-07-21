# map 与 set

`std::map` 是键值对容器，`std::set` 是不重复元素的集合。两者都自动排序。

## map

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> scores;

    scores["Alice"] = 95;
    scores["Bob"] = 87;
    scores["Charlie"] = 92;

    std::cout << scores["Alice"] << std::endl;

    for (const auto& pair : scores) {
        std::cout << pair.first << ": " << pair.second << std::endl;
    }

    auto it = scores.find("Bob");
    if (it != scores.end()) {
        std::cout << "Found: " << it->second << std::endl;
    }

    if (scores.count("David") == 0) {
        std::cout << "David not found" << std::endl;
    }
}
```

## set

```cpp
#include <iostream>
#include <set>

int main() {
    std::set<int> s;

    s.insert(3);
    s.insert(1);
    s.insert(4);
    s.insert(1);  // 重复，被忽略

    for (int x : s) {
        std::cout << x << " ";  // 1 3 4（已排序）
    }

    if (s.find(3) != s.end()) {
        std::cout << "Found 3" << std::endl;
    }

    s.erase(3);
}
```

## 原理：红黑树

`std::map` 和 `std::set` 底层是**红黑树**（Red-Black Tree），一种自平衡二叉搜索树。

红黑树性质：
1. 每个节点红色或黑色
2. 根节点黑色
3. 叶子节点（NIL）黑色
4. 红色节点的子节点必须是黑色
5. 任意节点到叶子节点的简单路径上黑色节点数相同

这些性质保证树高度 ≤ 2log₂(n+1)，即 O(log n) 的查找、插入、删除。

```cpp
// 红黑树节点
enum Color { RED, BLACK };

template <typename Key, typename Value>
struct RBNode {
    Key key;
    Value value;
    Color color;
    RBNode* left;
    RBNode* right;
    RBNode* parent;
};
```

## 原理：哈希表

`std::unordered_map` 和 `std::unordered_set` 底层是**哈希表**（Hash Table）。

- 对键计算哈希值 `hash(key) % bucket_count`
- 多个键映射到同一桶时，用链地址法解决冲突
- 负载因子（load factor）超过阈值时 rehash

```cpp
// 哈希节点
template <typename Key, typename Value>
struct HashNode {
    Key key;
    Value value;
    HashNode* next;  // 链表解决冲突
};
```

## unordered_map

```cpp
#include <unordered_map>

std::unordered_map<std::string, int> um;
um["apple"] = 5;
um["banana"] = 3;

// O(1) 平均查找
std::cout << um["apple"];
```

## 常用操作

| 操作 | map/set（红黑树） | unordered_map/unordered_set（哈希表） |
|------|------------------|--------------------------------------|
| 查找 | O(log n) | O(1) 平均 |
| 插入 | O(log n) | O(1) 平均 |
| 删除 | O(log n) | O(1) 平均 |
| 遍历 | 有序 | 无序 |
| 额外开销 | 每个节点维护 parent/color | 每个节点维护 hash/next |

## 建议

- 需要有序 → `map`/`set`
- 追求查找性能 → `unordered_map`/`unordered_set`
- `unordered_*` 不要求 `operator<`，需要 `std::hash` 和 `operator==`
