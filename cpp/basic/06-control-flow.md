# 控制流

根据条件执行不同代码分支。

## if / else

```cpp
int score = 85;

if (score >= 90) {
    std::cout << "优秀";
} else if (score >= 60) {
    std::cout << "及格";
} else {
    std::cout << "不及格";
}
```

## switch

```cpp
char grade = 'A';

switch (grade) {
    case 'A': std::cout << "优秀"; break;
    case 'B': std::cout << "良好"; break;
    case 'C': std::cout << "及格"; break;
    default:  std::cout << "未知";
}
```

注意每个 `case` 末尾要加 `break`，否则会穿透执行下一个 case。

## 三目运算符

```cpp
int a = 10, b = 20;
int max = (a > b) ? a : b;  // max = 20
```

语法：`条件 ? 表达式1 : 表达式2`
