from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import uuid
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'syntax-surgeon-secret-key-2024'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

active_sessions = {}

level_system = {
    "竹简": {
        "name": "竹简",
        "description": "初学者级别 - 基础错别字修复",
        "difficulty": 1,
        "max_score": 10,
        "paper_style": "bamboo",
        "unlock_score": 0
    },
    "帛书": {
        "name": "帛书",
        "description": "进阶级别 - 复杂语句诊断",
        "difficulty": 2,
        "max_score": 20,
        "paper_style": "silk",
        "unlock_score": 50
    },
    "宣纸": {
        "name": "宣纸",
        "description": "大师级别 - 古文修复挑战",
        "difficulty": 3,
        "max_score": 30,
        "paper_style": "rice",
        "unlock_score": 150
    }
}

complication_events = [
    {
        "id": "time_crisis",
        "type": "timed_bonus",
        "title": "⏰ 限时挑战！",
        "description": "接下来15秒内完成诊断可获得双倍积分！",
        "time_limit": 15,
        "bonus_multiplier": 2,
        "penalty": 0
    },
    {
        "id": "side_effect_choice",
        "type": "side_effect",
        "title": "⚠️ 出现并发症！",
        "description": "病人出现异常反应，请选择处理方式：",
        "options": [
            {"text": "保守治疗", "correct": True, "explanation": "正确！继续当前诊断任务"},
            {"text": "激进手术", "correct": False, "explanation": "文气值-10，请继续诊断"}
        ],
        "penalty": -10,
        "bonus": 5
    },
    {
        "id": "lucky_event",
        "type": "lucky",
        "title": "🍀 幸运事件！",
        "description": "获得了一个免费提示！现在可以免费使用听诊器一次。",
        "bonus": "free_hint",
        "time_limit": 0
    }
]

exercise_data = {
    "竹简": [
        {
            "id": 101,
            "original_text": "我们在教室里认真的学习。",
            "error_type": "错别字",
            "difficulty": 1,
            "level": "竹简",
            "errors": [
                {
                    "position": 7,
                    "original_char": "的",
                    "correct_char": "地",
                    "explanation": "'认真地学习'中的'地'用作副词修饰动词'学习'"
                }
            ]
        },
        {
            "id": 102,
            "original_text": "今天的天气真晴郎。",
            "error_type": "错别字",
            "difficulty": 1,
            "level": "竹简",
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
            "id": 103,
            "original_text": "春天来了，百花齐方。",
            "error_type": "错别字",
            "difficulty": 1,
            "level": "竹简",
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
            "id": 104,
            "original_text": "老师鼓厉我继续努力。",
            "error_type": "错别字",
            "difficulty": 1,
            "level": "竹简",
            "errors": [
                {
                    "position": 4,
                    "original_char": "厉",
                    "correct_char": "励",
                    "explanation": "'鼓励'指激励、勉励，用'励'"
                }
            ]
        },
        {
            "id": 105,
            "original_text": "我看见一只可爱的小免子。",
            "error_type": "错别字",
            "difficulty": 1,
            "level": "竹简",
            "errors": [
                {
                    "position": 9,
                    "original_char": "免",
                    "correct_char": "兔",
                    "explanation": "'兔子'的'兔'上面有一点"
                }
            ]
        }
    ],
    "帛书": [
        {
            "id": 201,
            "original_text": "我每天都要做很多的作业，真是太忙了。",
            "error_type": "赘字",
            "difficulty": 2,
            "level": "帛书",
            "errors": [
                {
                    "position": 9,
                    "original_char": "的",
                    "correct_char": "",
                    "explanation": "'很多作业'已经完整，不需要多余的'的'"
                }
            ]
        },
        {
            "id": 202,
            "original_text": "小明的成绩比小红的成绩好。",
            "error_type": "赘字",
            "difficulty": 2,
            "level": "帛书",
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
            "id": 203,
            "original_text": "这是一个多么美丽漂亮的花园啊！",
            "error_type": "赘字",
            "difficulty": 2,
            "level": "帛书",
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
            "id": 204,
            "original_text": "他的为人处事，总是斤斤计较、小气吝啬。",
            "error_type": "赘字",
            "difficulty": 2,
            "level": "帛书",
            "errors": [
                {
                    "position": 12,
                    "original_char": "小气",
                    "correct_char": "",
                    "explanation": "'斤斤计较'已包含小气之意，可删除重复"
                }
            ]
        },
        {
            "id": 205,
            "original_text": "这件事的的确确是我做错了。",
            "error_type": "赘字",
            "difficulty": 2,
            "level": "帛书",
            "errors": [
                {
                    "position": 4,
                    "original_char": "确确实实",
                    "correct_char": "确实",
                    "explanation": "'的确'和'确实'语义重复，保留一个即可"
                }
            ]
        }
    ],
    "宣纸": [
        {
            "id": 301,
            "original_text": "关于这件事情，我们将要在明天开会进行讨论。",
            "error_type": "语病",
            "difficulty": 3,
            "level": "宣纸",
            "errors": [
                {
                    "position": 12,
                    "original_char": "将要",
                    "correct_char": "",
                    "explanation": "'明天'已暗示未来，'将要'属多余"
                }
            ]
        },
        {
            "id": 302,
            "original_text": "通过这次的学习，使我明白了许多道理。",
            "error_type": "语病",
            "difficulty": 3,
            "level": "宣纸",
            "errors": [
                {
                    "position": 0,
                    "original_char": "通过",
                    "correct_char": "",
                    "explanation": "'通过...使...'结构缺主语，应删除'通过'或'使'"
                }
            ]
        },
        {
            "id": 303,
            "original_text": "他的写作水平显著提高了很多。",
            "error_type": "语病",
            "difficulty": 3,
            "level": "宣纸",
            "errors": [
                {
                    "position": 10,
                    "original_char": "很多",
                    "correct_char": "",
                    "explanation": "'显著'已表示程度，'很多'属多余"
                }
            ]
        },
        {
            "id": 304,
            "original_text": "为了避免今后不再发生类似的错误，我们要认真总结教训。",
            "error_type": "语病",
            "difficulty": 3,
            "level": "宣纸",
            "errors": [
                {
                    "position": 6,
                    "original_char": "不",
                    "correct_char": "",
                    "explanation": "'避免'与'不再'双重否定导致语义相反，应删除'不'"
                }
            ]
        },
        {
            "id": 305,
            "original_text": "谁也不能否认这不是一部好电影。",
            "error_type": "语病",
            "difficulty": 3,
            "level": "宣纸",
            "errors": [
                {
                    "position": 8,
                    "original_char": "不",
                    "correct_char": "",
                    "explanation": "三重否定导致语义混乱，应改为'谁也不能否认这是一部好电影'"
                }
            ]
        }
    ]
}

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

tools = [
    {
        "id": "tweezers",
        "name": "镊子",
        "emoji": "🔧",
        "description": "用于精准选取错字",
        "action": "select"
    },
    {
        "id": "scalpel",
        "name": "手术刀",
        "emoji": "🗡️",
        "description": "用于切除赘字",
        "action": "delete"
    },
    {
        "id": "suture_needle",
        "name": "缝合针",
        "emoji": "🪡",
        "description": "用于替换错字",
        "action": "replace"
    },
    {
        "id": "bandage",
        "name": "绷带",
        "emoji": "🩹",
        "description": "用于确认修改",
        "action": "confirm"
    },
    {
        "id": "stethoscope",
        "name": "听诊器",
        "emoji": "🩺",
        "description": "用于获取提示",
        "action": "hint"
    }
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/levels')
def get_levels():
    return jsonify({
        'success': True,
        'data': level_system
    })

@app.route('/api/levels/<level_name>')
def get_level_detail(level_name):
    if level_name in level_system:
        return jsonify({
            'success': True,
            'data': level_system[level_name]
        })
    return jsonify({
        'success': False,
        'message': '等级不存在'
    }), 404

@app.route('/api/tools')
def get_tools():
    return jsonify({
        'success': True,
        'data': tools
    })

@app.route('/api/exercise/random')
def get_random_exercise():
    all_exercises = []
    for level_exercises in exercise_data.values():
        all_exercises.extend(level_exercises)
    exercise = random.choice(all_exercises)
    return jsonify({
        'success': True,
        'data': exercise
    })

@app.route('/api/exercise/level/<level_name>')
def get_exercise_by_level(level_name):
    if level_name in exercise_data:
        exercise = random.choice(exercise_data[level_name])
        return jsonify({
            'success': True,
            'data': exercise
        })
    return jsonify({
        'success': False,
        'message': '等级不存在'
    }), 404

@app.route('/api/exercise/<int:exercise_id>')
def get_exercise(exercise_id):
    all_exercises = []
    for level_exercises in exercise_data.values():
        all_exercises.extend(level_exercises)
    exercise = next((e for e in all_exercises if e['id'] == exercise_id), None)
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
    
    all_exercises = []
    for level_exercises in exercise_data.values():
        all_exercises.extend(level_exercises)
    exercise = next((e for e in all_exercises if e['id'] == exercise_id), None)
    
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

@app.route('/api/complication/random')
def get_random_complication():
    complication = random.choice(complication_events)
    return jsonify({
        'success': True,
        'data': complication
    })

@app.route('/api/complication/check', methods=['POST'])
def check_complication_answer():
    data = request.get_json()
    complication_id = data.get('complication_id')
    user_choice = data.get('choice')
    
    complication = next((c for c in complication_events if c['id'] == complication_id), None)
    
    if not complication:
        return jsonify({
            'success': False,
            'message': '并发症不存在'
        }), 404
    
    if complication['type'] == 'side_effect':
        correct_option = next((o for o in complication['options'] if o['correct']), None)
        is_correct = user_choice == complication['options'].index(correct_option)
        
        return jsonify({
            'success': True,
            'data': {
                'correct': is_correct,
                'explanation': correct_option['explanation'] if correct_option else '',
                'bonus': complication['bonus'] if is_correct else complication['penalty']
            }
        })
    
    return jsonify({
        'success': False,
        'message': '不支持的并发症类型'
    }), 400

@app.route('/api/session/create', methods=['POST'])
def create_session():
    session_id = str(uuid.uuid4())[:8]
    active_sessions[session_id] = {
        'id': session_id,
        'players': [],
        'exercise': None,
        'choices': {},
        'created_at': __import__('time').time()
    }
    return jsonify({
        'success': True,
        'data': {
            'session_id': session_id
        }
    })

@app.route('/api/session/<session_id>')
def get_session(session_id):
    if session_id in active_sessions:
        return jsonify({
            'success': True,
            'data': active_sessions[session_id]
        })
    return jsonify({
        'success': False,
        'message': '会议不存在'
    }), 404

@socketio.on('join_session')
def handle_join_session(data):
    session_id = data.get('session_id')
    player_name = data.get('player_name', '匿名医生')
    
    if session_id not in active_sessions:
        emit('error', {'message': '会议不存在'})
        return
    
    join_room(session_id)
    
    player_info = {
        'id': request.sid,
        'name': player_name,
        'score': 0,
        'joined_at': __import__('time').time()
    }
    
    active_sessions[session_id]['players'].append(player_info)
    
    emit('player_joined', {
        'player': player_info,
        'players': active_sessions[session_id]['players']
    }, room=session_id)

@socketio.on('leave_session')
def handle_leave_session(data):
    session_id = data.get('session_id')
    
    if session_id in active_sessions:
        active_sessions[session_id]['players'] = [
            p for p in active_sessions[session_id]['players'] if p['id'] != request.sid
        ]
        leave_room(session_id)
        
        emit('player_left', {
            'player_id': request.sid,
            'players': active_sessions[session_id]['players']
        }, room=session_id)

@socketio.on('select_position')
def handle_select_position(data):
    session_id = data.get('session_id')
    position = data.get('position')
    player_name = data.get('player_name')
    
    if session_id in active_sessions:
        if position not in active_sessions[session_id]['choices']:
            active_sessions[session_id]['choices'][position] = []
        
        active_sessions[session_id]['choices'][position].append({
            'player_id': request.sid,
            'player_name': player_name,
            'position': position
        })
        
        emit('position_selected', {
            'position': position,
            'player_name': player_name,
            'choices': active_sessions[session_id]['choices']
        }, room=session_id)

@socketio.on('submit_answer')
def handle_submit_answer(data):
    session_id = data.get('session_id')
    position = data.get('position')
    answer = data.get('answer')
    player_name = data.get('player_name')
    is_correct = data.get('is_correct', False)
    
    if session_id in active_sessions:
        if position not in active_sessions[session_id]['choices']:
            active_sessions[session_id]['choices'][position] = []
        
        active_sessions[session_id]['choices'][position].append({
            'player_id': request.sid,
            'player_name': player_name,
            'answer': answer,
            'is_correct': is_correct
        })
        
        for player in active_sessions[session_id]['players']:
            if player['id'] == request.sid and is_correct:
                player['score'] += 10
        
        emit('answer_submitted', {
            'position': position,
            'answer': answer,
            'player_name': player_name,
            'is_correct': is_correct,
            'players': active_sessions[session_id]['players']
        }, room=session_id)

@socketio.on('start_exercise')
def handle_start_exercise(data):
    session_id = data.get('session_id')
    exercise = data.get('exercise')
    
    if session_id in active_sessions:
        active_sessions[session_id]['exercise'] = exercise
        active_sessions[session_id]['choices'] = {}
        
        emit('exercise_started', {
            'exercise': exercise,
            'session_id': session_id
        }, room=session_id)

@socketio.on('chat_message')
def handle_chat_message(data):
    session_id = data.get('session_id')
    message = data.get('message')
    player_name = data.get('player_name')
    
    emit('new_message', {
        'player_name': player_name,
        'message': message,
        'timestamp': __import__('time').time()
    }, room=session_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3252, debug=True)
