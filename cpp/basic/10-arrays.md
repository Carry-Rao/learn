# 数组

数组是存储相同类型元素的连续内存空间。

## 一维数组

```cpp
int arr[5];               // 声明，元素未初始化
int arr[5] = {1, 2, 3};   // 前三个初始化，其余为 0
int arr[] = {1, 2, 3};    // 自动推断大小
```

```cpp
#include <iostream>

int main() {
    int scores[5] = {85, 92, 78, 90, 88};

    for (int i = 0; i < 5; i++) {
        std::cout << "scores[" << i << "] = " << scores[i] << std::endl;
    }

    // 计算平均分
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += scores[i];
    }
    std::cout << "Average: " << sum / 5.0 << std::endl;

}
```

## 范围 for 循环（C++11）

```cpp
int arr[] = {1, 2, 3, 4, 5};
for (int x : arr) {
    std::cout << x << " ";
}
```

## 注意事项

- 数组大小必须是编译期常量
- 数组下标从 0 开始
- 访问越界不会报错，但可能导致未定义行为
