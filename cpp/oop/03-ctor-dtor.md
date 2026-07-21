# 构造与析构

构造函数在对象创建时自动调用，析构函数在对象销毁时自动调用。

## 构造函数

```cpp
class Student {
private:
    std::string name;
    int age;

public:
    Student(std::string n, int a) {  // 构造函数
        name = n;
        age = a;
    }

    void introduce() {
        std::cout << name << " " << age << std::endl;
    }
};

int main() {
    Student s("Alice", 20);  // 自动调用构造函数
    s.introduce();
}
```

## 初始化列表

```cpp
Student(std::string n, int a) : name(n), age(a) {}
```

对于 `const` 成员和引用成员必须用初始化列表。

## 默认构造函数

不提供任何构造函数时，编译器自动生成一个空的默认构造函数。如果定义了任何构造函数，编译器不再生成。

## 析构函数

```cpp
class Buffer {
private:
    int* data;

public:
    Buffer(int size) {
        data = new int[size];
    }

    ~Buffer() {        // 析构函数
        delete[] data;
    }
};
```

析构函数无参数、无返回值、不可重载。
