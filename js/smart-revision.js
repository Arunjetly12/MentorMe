// ========== CONFIG ==========
const SUPABASE_URL = 'https://icbgbhafcxgtpnlwxvti.supabase.co'; // <-- replace with your project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljYmdiaGFmY3hndHBubHd4dnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODQ0NDAsImV4cCI6MjA2NzQ2MDQ0MH0.KY6fpN_Y5RQB0X4NwzW5q-TcR8fnWxQKYzRjXx6Q4SY'; // <-- replace with your anon/public key
const BUCKET = 'question-images'; // <-- your bucket name
const REVIEW_SCHEDULE = [1, 3, 7, 15, 30];

const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Audio alarm setup
const revisionAlarm = new Audio('assets/audio4.mp3');

// Function to play revision alarm
function playRevisionAlarm() {
    revisionAlarm.currentTime = 0;
    revisionAlarm.play();
}

// ========== UTILITIES ==========
function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(date1, date2) {
  return Math.floor((new Date(date2) - new Date(date1)) / (1000 * 60 * 60 * 24));
}

// ========== AUTH ==========
async function getUser() {
  const { data, error } = await supa.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  return data.user;
}

// ========== IMAGE UPLOAD TO SUPABASE STORAGE ==========
async function uploadImageToSupabase(file, user_id) {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${user_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const { error } = await supa.storage.from(BUCKET).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) {
    alert('Image upload failed!');
    return null;
  }
  return fileName; // Save the storage path, not a public URL
}

// ========== GET SIGNED URL FOR IMAGE ==========
async function getSignedImageUrl(path) {
  if (!path) return null;
  const { data, error } = await supa.storage.from(BUCKET).createSignedUrl(path, 60 * 60); // 1 hour
  if (error) return null;
  return data.signedUrl;
}

// ========== DELETE IMAGE FROM STORAGE ==========
async function deleteImageFromSupabase(path) {
  if (!path) return;
  await supa.storage.from(BUCKET).remove([path]);
}

// ========== FORM HANDLING ==========
document.addEventListener('DOMContentLoaded', async function() {
  lucide.createIcons();

  // File input logic
  const fileInput = document.getElementById('question_image');
  const fileChosen = document.getElementById('file-chosen');
  const fileLabel = document.querySelector('.custom-file-label');
  if (fileInput && fileChosen && fileLabel) {
    fileLabel.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', function() {
      fileChosen.textContent = this.files[0] ? this.files[0].name : 'No file chosen';
    });
  }

  // Auth check
  const user = await getUser();
  if (!user) {
    alert('Please log in to use Smart Revision!');
    window.location.href = 'login.html'; // or your login page
    return;
  }

  // Check for due revisions and play alarm
  await checkForDueRevisions();

  // Add Wrong Question Form
  document.getElementById('wrong-question-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const question_text = document.getElementById('question_text').value.trim();
    const topic = document.getElementById('topic').value.trim();
    const explanation = document.getElementById('explanation').value.trim();
    const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(t => t.value);
    const file = fileInput.files[0];

    if (!question_text && !file) {
      alert('Please enter question text or choose an image.');
      return;
    }

    (async () => {
      let imagePath = null;
      if (file) {
        imagePath = await uploadImageToSupabase(file, user.id);
        if (!imagePath) return;
      }

      const { error } = await supa.from('wrong_questions').insert([{
        user_id: user.id,
        question_text,
        question_image: imagePath, // Save storage path
        topic,
        explanation,
        tags,
        date_added: getTodayISO(),
        is_revision_active: false,
        revision_started_on: null,
        review_schedule: REVIEW_SCHEDULE,
        completed_reviews: [],
        mastered: false
      }]);
      if (error) {
        alert('Failed to add question!');
        return;
      }
      e.target.reset();
      fileChosen.textContent = 'No file chosen';
      renderAll();
    })();
  });

  renderAll();
});

// Check for due revisions and play alarm
async function checkForDueRevisions() {
  try {
    const user = await getUser();
    if (!user) return;
    
    const { data, error } = await supa
      .from('wrong_questions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_revision_active', true)
      .eq('mastered', false);
      
    if (error) {
      console.error('Error checking due revisions:', error);
      return;
    }
    
    const today = getTodayISO();
    const dueRevisions = data.filter(q => {
      if (!q.revision_started_on) return false;
      const daysSince = daysBetween(q.revision_started_on, today);
      return q.review_schedule.some((d, i) =>
        daysSince === d && !q.completed_reviews.includes(d)
      );
    });
    
    // If there are due revisions, play alarm
    if (dueRevisions.length > 0) {
      setTimeout(() => {
        playRevisionAlarm();
      }, 1000);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ========== FETCH & RENDER ==========
async function fetchQuestions() {
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supa
    .from('wrong_questions')
    .select('*')
    .eq('user_id', user.id)
    .order('date_added', { ascending: false });
  if (error) {
    alert('Failed to fetch questions!');
    return [];
  }
  return data;
}

async function renderAll() {
  const questions = await fetchQuestions();
  await renderWrongQuestions(questions);
  await renderTodaysRevisions(questions);
  await renderProgressTimeline(questions);
  await renderCompletedRevisions(questions);
}

async function renderWrongQuestions(questions) {
  const list = document.getElementById('wrong-questions-list');
  const filtered = questions.filter(q => !q.mastered);
  if (!filtered.length) {
    list.innerHTML = '<p>No wrong questions added yet.</p>';
    return;
  }
  list.innerHTML = '';
  for (const q of filtered) {
    const div = document.createElement('div');
    div.className = 'wrong-question-item';
    div.style = 'background:rgba(0,0,0,0.10);border-radius:8px;padding:10px 8px;margin-bottom:10px;position:relative;';
    let imgHtml = '';
    if (q.question_image) {
      const signedUrl = await getSignedImageUrl(q.question_image);
      if (signedUrl) {
        imgHtml = `<img src="${signedUrl}" alt="Question Image" style="max-width:100%;border-radius:6px;margin-top:6px;">`;
      }
    }
    div.innerHTML = `
      <button class="delete-question-btn" data-id="${q.id}" data-img="${q.question_image || ''}" title="Delete" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#ff4d4f;font-size:16px;z-index:2;"><span data-lucide="trash-2"></span></button>
      <div style="font-weight:600;color:#ffe09d;">${q.topic || 'No topic'}</div>
      <div style="margin:6px 0;">
        ${q.question_text ? `<div style="color:#fff;">${q.question_text}</div>` : ''}
        ${imgHtml}
      </div>
      <div style="font-size:13px;color:#b783ff;">${q.tags && q.tags.length ? q.tags.join(', ') : ''}</div>
      <div style="font-size:13px;color:#ffe09d;">${q.explanation ? 'Why: ' + q.explanation : ''}</div>
      <div style="margin-top:8px;">
        ${q.is_revision_active
          ? `<span style="color:#28a745;font-weight:600;">Smart Revision Active</span>`
          : `<button class="btn start-revision-btn" data-id="${q.id}" style="background:linear-gradient(90deg,#b783ff 60%,#FFCC00 100%);color:#222;font-size:13px;padding:7px 14px;">Start Smart Revision</button>`
        }
      </div>
    `;
    list.appendChild(div);
  }
  // Add event listeners for Start Smart Revision
  list.querySelectorAll('.start-revision-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const { error } = await supa
        .from('wrong_questions')
        .update({
          is_revision_active: true,
          revision_started_on: getTodayISO(),
          completed_reviews: []
        })
        .eq('id', btn.dataset.id);
      if (error) alert('Failed to start revision!');
      renderAll();
    });
  });
  // Add event listeners for Delete
  list.querySelectorAll('.delete-question-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('Delete this question?')) return;
      const imgPath = btn.getAttribute('data-img');
      if (imgPath) await deleteImageFromSupabase(imgPath);
      const { error } = await supa
        .from('wrong_questions')
        .delete()
        .eq('id', btn.dataset.id);
      if (error) alert('Failed to delete!');
      renderAll();
    });
  });
  lucide.createIcons();
}

async function renderTodaysRevisions(questions) {
  const list = document.getElementById('todays-revisions-list');
  const today = getTodayISO();
  const filtered = questions.filter(q => q.is_revision_active && !q.mastered);
  const due = filtered.filter(q => {
    if (!q.revision_started_on) return false;
    const daysSince = daysBetween(q.revision_started_on, today);
    return q.review_schedule.some((d, i) =>
      daysSince === d && !q.completed_reviews.includes(d)
    );
  });
  if (!due.length) {
    list.innerHTML = '<p>No revisions due today.</p>';
    return;
  }
  list.innerHTML = '';
  for (const q of due) {
    let imgHtml = '';
    if (q.question_image) {
      const signedUrl = await getSignedImageUrl(q.question_image);
      if (signedUrl) {
        imgHtml = `<img src="${signedUrl}" alt="Question Image" style="max-width:100%;border-radius:6px;margin-top:6px;">`;
      }
    }
    const daysSince = daysBetween(q.revision_started_on, today);
    const nextDay = q.review_schedule.find(d => daysSince === d && !q.completed_reviews.includes(d));
    const div = document.createElement('div');
    div.className = 'todays-revision-item';
    div.style = 'background:rgba(0,0,0,0.10);border-radius:8px;padding:10px 8px;margin-bottom:10px;';
    div.innerHTML = `
      <div style="font-weight:600;color:#ffe09d;">${q.topic || 'No topic'}</div>
      <div style="margin:6px 0;">
        ${q.question_text ? `<div style="color:#fff;">${q.question_text}</div>` : ''}
        ${imgHtml}
      </div>
      <div style="font-size:13px;color:#b783ff;">${q.tags && q.tags.length ? q.tags.join(', ') : ''}</div>
      <div style="font-size:13px;color:#ffe09d;">${q.explanation ? 'Why: ' + q.explanation : ''}</div>
      <div style="margin-top:8px;">
        <span style="color:#FFCC00;font-weight:600;">Day ${nextDay} Review</span>
        <button class="btn revise-now-btn" data-id="${q.id}" data-day="${nextDay}" style="background:linear-gradient(90deg,#28a745 60%,#FFCC00 100%);color:#222;font-size:13px;padding:7px 14px;margin-left:10px;">Revise Now ✅</button>
      </div>
    `;
    list.appendChild(div);
  }
  // Add event listeners for Revise Now
  list.querySelectorAll('.revise-now-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const q = questions.find(q => q.id === btn.dataset.id);
      const day = parseInt(btn.dataset.day);
      if (q && !q.completed_reviews.includes(day)) {
        const newCompleted = [...q.completed_reviews, day];
        const mastered = newCompleted.length === q.review_schedule.length;
        const { error } = await supa
          .from('wrong_questions')
          .update({
            completed_reviews: newCompleted,
            mastered,
            is_revision_active: mastered ? false : q.is_revision_active
          })
          .eq('id', q.id);
        if (error) alert('Failed to update revision!');
        
        // Play alarm when revision is completed
        playRevisionAlarm();
        
        btn.parentElement.innerHTML = `<span style="color:#28a745;font-weight:600;">🎉 Day ${day} Review Complete!${mastered ? ' Mastered!' : ''}</span>`;
        setTimeout(renderAll, 1200);
      }
    });
  });
}

async function renderProgressTimeline(questions) {
  const list = document.getElementById('progress-timeline-list');
  const filtered = questions.filter(q => q.is_revision_active && !q.mastered);
  if (!filtered.length) {
    list.innerHTML = '<p>No active revision in progress.</p>';
    return;
  }
  list.innerHTML = '';
  for (const q of filtered) {
    let imgHtml = '';
    if (q.question_image) {
      const signedUrl = await getSignedImageUrl(q.question_image);
      if (signedUrl) {
        imgHtml = `<img src="${signedUrl}" alt="Question Image" style="max-width:100%;border-radius:6px;margin-top:6px;">`;
      }
    }
    const div = document.createElement('div');
    div.className = 'progress-timeline-item';
    div.style = 'background:rgba(0,0,0,0.10);border-radius:8px;padding:10px 8px;margin-bottom:10px;';
    div.innerHTML = `
      <div style="font-weight:600;color:#ffe09d;">${q.topic || 'No topic'}</div>
      <div style="margin:6px 0;">
        ${q.question_text ? `<div style="color:#fff;">${q.question_text}</div>` : ''}
        ${imgHtml}
      </div>
      <div class="progress-timeline-bar">
        ${q.review_schedule.map(day => {
          const done = q.completed_reviews.includes(day);
          return `<span class="progress-timeline-dot${done ? ' completed' : ''}">${done ? '✓' : day}</span>`;
        }).join('')}
      </div>
      <div style="font-size:13px;color:#b783ff;margin-top:6px;">
        ${q.completed_reviews.length} / ${q.review_schedule.length} reviews done
      </div>
    `;
    list.appendChild(div);
  }
}

async function renderCompletedRevisions(questions) {
  const list = document.getElementById('completed-revisions-list');
  const filtered = questions.filter(q => q.mastered);
  if (!filtered.length) {
    list.innerHTML = '<p>No questions mastered yet.</p>';
    return;
  }
  list.innerHTML = '';
  for (const q of filtered) {
    let imgHtml = '';
    if (q.question_image) {
      const signedUrl = await getSignedImageUrl(q.question_image);
      if (signedUrl) {
        imgHtml = `<img src="${signedUrl}" alt="Question Image" style="max-width:100%;border-radius:6px;margin-top:6px;">`;
      }
    }
    const div = document.createElement('div');
    div.className = 'completed-revision-item';
    div.style = 'background:rgba(0,0,0,0.10);border-radius:8px;padding:10px 8px;margin-bottom:10px;position:relative;';
    div.innerHTML = `
      <button class="delete-question-btn" data-id="${q.id}" data-img="${q.question_image || ''}" title="Delete" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#ff4d4f;font-size:16px;z-index:2;"><span data-lucide="trash-2"></span></button>
      <div style="font-weight:600;color:#ffe09d;">${q.topic || 'No topic'}</div>
      <div style="margin:6px 0;">
        ${q.question_text ? `<div style="color:#fff;">${q.question_text}</div>` : ''}
        ${imgHtml}
      </div>
      <div style="font-size:13px;color:#b783ff;">${q.tags && q.tags.length ? q.tags.join(', ') : ''}</div>
      <div style="font-size:13px;color:#ffe09d;">${q.explanation ? 'Why: ' + q.explanation : ''}</div>
      <div style="margin-top:8px;">
        <span style="color:#28a745;font-weight:600;">Mastered ✅</span>
      </div>
    `;
    list.appendChild(div);
  }
  // Add event listeners for Delete
  list.querySelectorAll('.delete-question-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('Delete this question?')) return;
      const imgPath = btn.getAttribute('data-img');
      if (imgPath) await deleteImageFromSupabase(imgPath);
      const { error } = await supa
        .from('wrong_questions')
        .delete()
        .eq('id', btn.dataset.id);
      if (error) alert('Failed to delete!');
      renderAll();
    });
  });
  lucide.createIcons();
}

// ========== END ========== 