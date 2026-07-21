# class

类将数据和操作封装在一起。

## 定义

```cpp
class Student {
private:
    std::string name;
    int age;

public:
    Student(std::string n, int a) : name(n), age(a) {}

    void introduce() const {
        std::cout << name << " " << age;
    }

    void setName(std::string n) { name = n; }
    std::string getName() const { return name; }
};

int main() {
    Student s("Alice", 20);
    s.introduce();
}
```

## 访问权限

| 关键字 | 访问范围 |
|--------|----------|
| `public` | 任何地方 |
| `private` | 仅类内部 |
| `protected` | 类内部 + 子类 |

## const 成员函数

函数末尾加 `const`，声明不修改成员。只有 `const` 函数可被 `const` 对象调用：

```cpp
std::string getName() const { return name; }
```

## 成员函数类外定义

```cpp
class Student {
public:
    void introduce() const;
};

void Student::introduce() const {
    std::cout << name;
}
```
