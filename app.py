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
    "竹簡": {
        "name": "竹簡",
        "description": "初學者級別 - 基礎錯別字修復",
        "difficulty": 1,
        "max_score": 10,
        "paper_style": "bamboo",
        "unlock_score": 0
    },
    "帛書": {
        "name": "帛書",
        "description": "進階級別 - 複雜語句診斷",
        "difficulty": 2,
        "max_score": 20,
        "paper_style": "silk",
        "unlock_score": 50
    },
    "宣紙": {
        "name": "宣紙",
        "description": "大師級別 - 古文修復挑戰",
        "difficulty": 3,
        "max_score": 30,
        "paper_style": "rice",
        "unlock_score": 150
    }
}

complication_events = [
    {
        "id": "time_crisis",
        "type": "timed_diagnosis",
        "title": "⏰ 急診時間！",
        "description": "病人情況危急，必須在10秒內做出診斷！",
        "time_limit": 10,
        "penalty": -20,
        "bonus": 30
    },
    {
        "id": "side_effect_choice",
        "type": "side_effect",
        "title": "⚠️ 併發症選擇！",
        "description": "治療過程中出現併發症，請選擇正確的處理方式！",
        "options": [
            {"text": "使用強力藥劑", "correct": False, "explanation": "強力藥劑會對病人造成更大傷害"},
            {"text": "溫和處理，觀察情況", "correct": True, "explanation": "溫和處理是正確的選擇"}
        ],
        "penalty": -15,
        "bonus": 25
    },
    {
        "id": "emergency_consult",
        "type": "emergency",
        "title": "🚨 緊急會診！",
        "description": "多位專家需要同時診斷，請快速做出決定！",
        "time_limit": 8,
        "penalty": -25,
        "bonus": 40
    }
]

exercise_data = {
    "竹簡": [
        {
            "id": 101,
            "original_text": "我們在教室裡認真的學習。",
            "error_type": "錯別字",
            "difficulty": 1,
            "level": "竹簡",
            "errors": [
                {
                    "position": 7,
                    "original_char": "的",
                    "correct_char": "地",
                    "explanation": "'認真地學習'中的'地'用作副詞修飾動詞'學習'"
                }
            ]
        },
        {
            "id": 102,
            "original_text": "今天的天氣真晴郎。",
            "error_type": "錯別字",
            "difficulty": 1,
            "level": "竹簡",
            "errors": [
                {
                    "position": 7,
                    "original_char": "郎",
                    "correct_char": "朗",
                    "explanation": "'晴朗'指天氣晴好，'朗'表示明亮"
                }
            ]
        },
        {
            "id": 103,
            "original_text": "春天來了，百花齊方。",
            "error_type": "錯別字",
            "difficulty": 1,
            "level": "竹簡",
            "errors": [
                {
                    "position": 8,
                    "original_char": "方",
                    "correct_char": "放",
                    "explanation": "'百花齊放'指各種花朵同時開放"
                }
            ]
        },
        {
            "id": 104,
            "original_text": "老師鼓厲我繼續努力。",
            "error_type": "錯別字",
            "difficulty": 1,
            "level": "竹簡",
            "errors": [
                {
                    "position": 4,
                    "original_char": "厲",
                    "correct_char": "勵",
                    "explanation": "'鼓勵'指激勵、勉勵，用'勵'"
                }
            ]
        },
        {
            "id": 105,
            "original_text": "我看見一隻可愛的小免子。",
            "error_type": "錯別字",
            "difficulty": 1,
            "level": "竹簡",
            "errors": [
                {
                    "position": 9,
                    "original_char": "免",
                    "correct_char": "兔",
                    "explanation": "'兔子'的'兔'上面有一點"
                }
            ]
        }
    ],
    "帛書": [
        {
            "id": 201,
            "original_text": "我每天都要做很多的作業，真是太忙了。",
            "error_type": "贅字",
            "difficulty": 2,
            "level": "帛書",
            "errors": [
                {
                    "position": 9,
                    "original_char": "的",
                    "correct_char": "",
                    "explanation": "'很多作業'已經完整，不需要多餘的'的'"
                }
            ]
        },
        {
            "id": 202,
            "original_text": "小明的成績比小紅的成績好。",
            "error_type": "贅字",
            "difficulty": 2,
            "level": "帛書",
            "errors": [
                {
                    "position": 8,
                    "original_char": "的成績",
                    "correct_char": "",
                    "explanation": "可以簡化為'小明的成績比小紅好'"
                }
            ]
        },
        {
            "id": 203,
            "original_text": "這是一個多麼美麗漂亮的花園啊！",
            "error_type": "贅字",
            "difficulty": 2,
            "level": "帛書",
            "errors": [
                {
                    "position": 8,
                    "original_char": "漂亮",
                    "correct_char": "",
                    "explanation": "'美麗'和'漂亮'意思相近，可以去掉其中一個"
                }
            ]
        },
        {
            "id": 204,
            "original_text": "他的為人處事，總是斤斤計較、小氣吝嗇。",
            "error_type": "贅字",
            "difficulty": 2,
            "level": "帛書",
            "errors": [
                {
                    "position": 12,
                    "original_char": "小氣",
                    "correct_char": "",
                    "explanation": "'斤斤計較'已包含小氣之意，可刪除重複"
                }
            ]
        },
        {
            "id": 205,
            "original_text": "這件事的確確實實是我做錯了。",
            "error_type": "贅字",
            "difficulty": 2,
            "level": "帛書",
            "errors": [
                {
                    "position": 4,
                    "original_char": "確確實實",
                    "correct_char": "確實",
                    "explanation": "'的確'和'確實'語義重複，保留一個即可"
                }
            ]
        }
    ],
    "宣紙": [
        {
            "id": 301,
            "original_text": "關於這件事情，我們將要在明天開會進行討論。",
            "error_type": "語病",
            "difficulty": 3,
            "level": "宣紙",
            "errors": [
                {
                    "position": 12,
                    "original_char": "將要",
                    "correct_char": "",
                    "explanation": "'明天'已暗示未來，'將要'屬多餘"
                }
            ]
        },
        {
            "id": 302,
            "original_text": "通過這次的學習，使我明白了許多道理。",
            "error_type": "語病",
            "difficulty": 3,
            "level": "宣紙",
            "errors": [
                {
                    "position": 0,
                    "original_char": "通過",
                    "correct_char": "",
                    "explanation": "'通過...使...'結構缺主語，應刪除'通過'或'使'"
                }
            ]
        },
        {
            "id": 303,
            "original_text": "他的寫作水平顯著提高了很多。",
            "error_type": "語病",
            "difficulty": 3,
            "level": "宣紙",
            "errors": [
                {
                    "position": 10,
                    "original_char": "很多",
                    "correct_char": "",
                    "explanation": "'顯著'已表示程度，'很多'屬多餘"
                }
            ]
        },
        {
            "id": 304,
            "original_text": "為了避免今後不再發生類似的錯誤，我們要認真總結教訓。",
            "error_type": "語病",
            "difficulty": 3,
            "level": "宣紙",
            "errors": [
                {
                    "position": 6,
                    "original_char": "不",
                    "correct_char": "",
                    "explanation": "'避免'與'不再'雙重否定導致語義相反，應刪除'不'"
                }
            ]
        },
        {
            "id": 305,
            "original_text": "誰也不能否認這不是一部好電影。",
            "error_type": "語病",
            "difficulty": 3,
            "level": "宣紙",
            "errors": [
                {
                    "position": 8,
                    "original_char": "不",
                    "correct_char": "",
                    "explanation": "三重否定導致語義混亂，應改為'誰也不能否認這是一部好電影'"
                }
            ]
        }
    ]
}

doctor_characters = [
    {
        "name": "啄木鳥醫生",
        "emoji": "🪶",
        "image": "🐦",
        "description": "森林裡最厲害的語言醫生，專門吃掉錯別字"
    },
    {
        "name": "小馬醫生",
        "emoji": "🐴",
        "image": "🐴",
        "description": "年輕有為的語言治療師，充滿活力"
    },
    {
        "name": "貓頭鷹醫生",
        "emoji": "🦉",
        "image": "🦉",
        "description": "智慧的語言學者，懂得很多語法知識"
    },
    {
        "name": "熊貓醫生",
        "emoji": "🐼",
        "image": "🐼",
        "description": "溫柔可愛的語言醫生，深受小朋友喜愛"
    }
]

tools = [
    {
        "id": "tweezers",
        "name": "鑷子",
        "emoji": "🔧",
        "description": "用於精準選取錯字",
        "action": "select"
    },
    {
        "id": "scalpel",
        "name": "手術刀",
        "emoji": "🗡️",
        "description": "用於切除贅字",
        "action": "delete"
    },
    {
        "id": "suture_needle",
        "name": "縫合針",
        "emoji": "🪡",
        "description": "用於替換錯字",
        "action": "replace"
    },
    {
        "id": "bandage",
        "name": "繃帶",
        "emoji": "🩹",
        "description": "用於確認修改",
        "action": "confirm"
    },
    {
        "id": "stethoscope",
        "name": "聽診器",
        "emoji": "🩺",
        "description": "用於獲取提示",
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
        'message': '等級不存在'
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
        'message': '等級不存在'
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
        'message': '練習不存在'
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
            'message': '練習不存在'
        }), 404
    
    error = next((err for err in exercise['errors'] if err['position'] == position), None)
    
    if not error:
        return jsonify({
            'success': False,
            'message': '該位置沒有錯誤'
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
                'message': '太棒了！你成功修復了這個語病！'
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
                'message': '哎呀，這個答案不太對哦，再試試看？'
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
            'message': '併發症不存在'
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
        'message': '不支持的併發症類型'
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
        'message': '會議不存在'
    }), 404

@socketio.on('join_session')
def handle_join_session(data):
    session_id = data.get('session_id')
    player_name = data.get('player_name', '匿名醫生')
    
    if session_id not in active_sessions:
        emit('error', {'message': '會議不存在'})
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
