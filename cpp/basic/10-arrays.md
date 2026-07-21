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

## 数组的存储位置

数组可分配在栈或堆上。

```cpp
// 栈上分配（自动管理）
int stack_arr[100];           // 大小需编译期常量
// 栈空间有限（通常 1~8 MB），过大会栈溢出

// 堆上分配（手动管理）
int* heap_arr = new int[100]; // 运行时决定大小
delete[] heap_arr;

// 堆上分配（现代 C++，推荐）
auto safe_arr = std::make_unique<int[]>(100);
auto shared_arr = std::make_shared<int[]>(100);
```

### 栈 vs 堆

| | 栈数组 | 堆数组 |
|--|--------|--------|
| 速度 | 极快 | 较慢 |
| 大小限制 | 小（几 MB） | 大（取决于系统） |
| 生命周期 | 作用域结束自动释放 | 手动或智能指针管理 |
| 大小确定 | 编译期 | 运行期 |
| 推荐场景 | 小数组、固定大小 | 大数组、动态大小 |

### 建议

- **小数组（< 1K 元素）且大小固定** → 栈上 `int arr[N]`
- **大数组或大小运行时确定** → `std::vector` 或 `std::unique_ptr<T[]>`
- **不要用裸 `new[]/delete[]`**，用智能指针或容器

## 多维数组

```cpp
// 二维数组
int mat[3][4] = {
    {1, 2, 3, 4},
    {5, 6, 7, 8},
    {9, 10, 11, 12}
};

mat[0][0];              // 1
mat[2][3];              // 12

// 遍历
for (int i = 0; i < 3; i++)
    for (int j = 0; j < 4; j++)
        std::cout << mat[i][j];

// 内存连续：按行优先存储
// [row0][row1][row2]...
```

多维数组本质上是"数组的数组"——`mat[3][4]` 是 3 个元素的数组，每个元素是 `int[4]`。

```cpp
// 动态二维数组（不连续，不推荐）
int** dyn = new int*[rows];
for (int i = 0; i < rows; i++)
    dyn[i] = new int[cols];

// 推荐：用一维数组模拟
std::vector<int> flat(rows * cols);
flat[i * cols + j];  // 访问 (i, j)
```

## 全局变量

全局变量和静态变量不在栈也不在堆，存放在静态存储区（数据段/BSS 段）。

```cpp
int global_arr[1000];        // 全局数组 → 静态存储区
static int static_arr[100];  // 静态数组 → 静态存储区

void func() {
    static int cache[50];    // 静态局部 → 静态存储区
    int local[10];           // 局部 → 栈
    int* p = new int[20];    // 动态 → 堆
}
```

| 存储位置 | 生命周期 | 分配方式 |
|----------|----------|----------|
| 静态区（数据段/BSS） | 整个程序运行期 | 编译期确定 |
| 栈 | 作用域内 | 函数调用时 |
| 堆 | 手动管理 | 运行时分配 |

**全局变量 ≠ 堆**。全局变量在程序启动前就已分配好，不存在于堆上。

## 注意事项

- C 风格数组大小必须是编译期常量
- 数组下标从 0 开始
- 访问越界不会报错，但可能导致未定义行为
- 数组名会退化为指针，传给函数后丢失大小信息

