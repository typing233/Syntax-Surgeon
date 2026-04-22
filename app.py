from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

exercise_data = [
    {
        "id": 1,
        "original_text": "我们在教室里认真的学习。",
        "error_type": "错别字",
        "errors": [
            {
                "position": 8,
                "original_char": "的",
                "correct_char": "地",
                "explanation": "'认真地学习'中的'地'用作副词修饰动词'学习'"
            }
        ]
    },
    {
        "id": 2,
        "original_text": "今天的天气真晴郎。",
        "error_type": "错别字",
        "errors": [
            {
                "position": 7,
                "original_char": "郎",
                "correct_char": "朗",
                "explanation": "'晴朗'指天气晴好，'朗'表示明亮"
            }
        ]
    },
    {
        "id": 3,
        "original_text": "我每天都要做很多的作业，真是太忙了。",
        "error_type": "赘字",
        "errors": [
            {
                "position": 8,
                "original_char": "的",
                "correct_char": "",
                "explanation": "'很多作业'已经完整，不需要多余的'的'"
            }
        ]
    },
    {
        "id": 4,
        "original_text": "春天来了，百花齐方。",
        "error_type": "错别字",
        "errors": [
            {
                "position": 8,
                "original_char": "方",
                "correct_char": "放",
                "explanation": "'百花齐放'指各种花朵同时开放"
            }
        ]
    },
    {
        "id": 5,
        "original_text": "小明的成绩比小红的成绩好。",
        "error_type": "赘字",
        "errors": [
            {
                "position": 8,
                "original_char": "的成绩",
                "correct_char": "",
                "explanation": "可以简化为'小明的成绩比小红好'"
            }
        ]
    },
    {
        "id": 6,
        "original_text": "老师鼓厉我继续努力。",
        "error_type": "错别字",
        "errors": [
            {
                "position": 3,
                "original_char": "厉",
                "correct_char": "励",
                "explanation": "'鼓励'指激励、勉励，用'励'"
            }
        ]
    },
    {
        "id": 7,
        "original_text": "这是一个多么美丽漂亮的花园啊！",
        "error_type": "赘字",
        "errors": [
            {
                "position": 8,
                "original_char": "漂亮",
                "correct_char": "",
                "explanation": "'美丽'和'漂亮'意思相近，可以去掉其中一个"
            }
        ]
    },
    {
        "id": 8,
        "original_text": "我在公园里看见一只可爱的小免子。",
        "error_type": "错别字",
        "errors": [
            {
                "position": 13,
                "original_char": "免",
                "correct_char": "兔",
                "explanation": "'兔子'的'兔'上面有一点"
            }
        ]
    }
]

doctor_characters = [
    {
        "name": "啄木鸟医生",
        "emoji": "🪶",
        "image": "🐦",
        "description": "森林里最厉害的语言医生，专门吃掉错别字"
    },
    {
        "name": "小马医生",
        "emoji": "🐴",
        "image": "🐴",
        "description": "年轻有为的语言治疗师，充满活力"
    },
    {
        "name": "猫头鹰医生",
        "emoji": "🦉",
        "image": "🦉",
        "description": "智慧的语言学者，懂得很多语法知识"
    },
    {
        "name": "熊猫医生",
        "emoji": "🐼",
        "image": "🐼",
        "description": "温柔可爱的语言医生，深受小朋友喜爱"
    }
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/exercise/random')
def get_random_exercise():
    exercise = random.choice(exercise_data)
    return jsonify({
        'success': True,
        'data': exercise
    })

@app.route('/api/exercise/<int:exercise_id>')
def get_exercise(exercise_id):
    exercise = next((e for e in exercise_data if e['id'] == exercise_id), None)
    if exercise:
        return jsonify({
            'success': True,
            'data': exercise
        })
    return jsonify({
        'success': False,
        'message': '练习不存在'
    }), 404

@app.route('/api/exercise/check', methods=['POST'])
def check_answer():
    data = request.get_json()
    exercise_id = data.get('exercise_id')
    position = data.get('position')
    user_answer = data.get('user_answer', '')
    
    exercise = next((e for e in exercise_data if e['id'] == exercise_id), None)
    
    if not exercise:
        return jsonify({
            'success': False,
            'message': '练习不存在'
        }), 404
    
    error = next((err for err in exercise['errors'] if err['position'] == position), None)
    
    if not error:
        return jsonify({
            'success': False,
            'message': '该位置没有错误'
        }), 400
    
    correct_char = error['correct_char']
    original_char = error['original_char']
    
    if user_answer == correct_char or (correct_char == '' and user_answer == ''):
        return jsonify({
            'success': True,
            'data': {
                'correct': True,
                'original_char': original_char,
                'correct_char': correct_char,
                'explanation': error['explanation'],
                'message': '太棒了！你成功修复了这个语病！'
            }
        })
    else:
        return jsonify({
            'success': True,
            'data': {
                'correct': False,
                'original_char': original_char,
                'user_answer': user_answer,
                'correct_char': correct_char,
                'explanation': error['explanation'],
                'message': '哎呀，这个答案不太对哦，再试试看？'
            }
        })

@app.route('/api/doctors')
def get_doctors():
    return jsonify({
        'success': True,
        'data': doctor_characters
    })

@app.route('/api/doctor/random')
def get_random_doctor():
    doctor = random.choice(doctor_characters)
    return jsonify({
        'success': True,
        'data': doctor
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9346, debug=True)
