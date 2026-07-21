# 循环

C++ 有三种循环结构。

## for 循环

适用于已知循环次数。

```cpp
for (int i = 0; i < 5; i++) {
    std::cout << i << " ";
}
// 输出: 0 1 2 3 4
```

## while 循环

适用于未知循环次数。

```cpp
int n = 123, sum = 0;
while (n > 0) {
    sum += n % 10;
    n /= 10;
}
```

## do-while 循环

至少执行一次。

```cpp
int x;
do {
    std::cout << "Enter positive number: ";
    std::cin >> x;
} while (x <= 0);
```

## break 与 continue

- `break` — 跳出整个循环
- `continue` — 跳过本次循环剩余语句，进入下一次

```cpp
for (int i = 0; i < 10; i++) {
    if (i == 5) break;      // 到 5 就停止
    if (i % 2 == 0) continue; // 跳过偶数
    std::cout << i << " ";
}
// 输出: 1 3
```
