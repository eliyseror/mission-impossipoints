const Store = {

  // ==================== Config (PIN) ====================

  async getPin() {
    const doc = await db.collection('config').doc('settings').get();
    return doc.exists ? doc.data().pin : null;
  },

  async setPin(pin) {
    await db.collection('config').doc('settings').set({ pin }, { merge: true });
  },

  async getDailySpecial() {
    const doc = await db.collection('config').doc('dailySpecial').get();
    return doc.exists ? doc.data() : null;
  },

  async setDailySpecial(choreId, date) {
    return db.collection('config').doc('dailySpecial').set({ choreId, date });
  },

  async getSuccessPoints() {
    const snap = await db.collection('config').doc('successPoints').get();
    return snap.exists ? snap.data() : {};
  },

  async setSuccessPointsForKid(kidId, pointsMap) {
    return db.collection('config').doc('successPoints').set(
      { [kidId]: pointsMap }, { merge: true }
    );
  },

  async getWeekHistory(startDate, endDate) {
    const snap = await db.collection('history')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(h => {
        if (!h.createdAt) return false;
        const d = h.createdAt.toDate ? h.createdAt.toDate() : new Date(h.createdAt);
        return d >= startDate && d <= endDate;
      });
  },

  // ==================== Kids ====================

  async getKids() {
    const snap = await db.collection('kids').orderBy('createdAt').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addKid(name, icon) {
    return db.collection('kids').add({
      name, icon, points: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async updateKid(id, data) {
    return db.collection('kids').doc(id).update(data);
  },

  async deleteKid(id) {
    await db.collection('kids').doc(id).delete();
    const history = await db.collection('history').where('kidId', '==', id).get();
    const batch = db.batch();
    history.docs.forEach(d => batch.delete(d.ref));
    return batch.commit();
  },

  async addPoints(kidId, amount) {
    return db.collection('kids').doc(kidId).update({
      points: firebase.firestore.FieldValue.increment(amount)
    });
  },

  // ==================== Chores (Missions) ====================

  async getChores() {
    const snap = await db.collection('chores').orderBy('points').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addChore(name, points, timeOfDay = 'morning') {
    return db.collection('chores').add({ name, points: Number(points), timeOfDay, active: true });
  },

  async updateChore(id, data) {
    if (data.points) data.points = Number(data.points);
    return db.collection('chores').doc(id).update(data);
  },

  async deleteChore(id) { return db.collection('chores').doc(id).delete(); },

  // ==================== Prizes ====================

  async getPrizes() {
    const snap = await db.collection('prizes').orderBy('cost').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addPrize(name, cost) {
    return db.collection('prizes').add({ name, cost: Number(cost), active: true });
  },

  async updatePrize(id, data) {
    if (data.cost) data.cost = Number(data.cost);
    return db.collection('prizes').doc(id).update(data);
  },

  async deletePrize(id) { return db.collection('prizes').doc(id).delete(); },

  // ==================== History / Requests ====================

  async addRequest(kidId, kidName, itemId, itemName, type, points) {
    if (type === 'chore') {
      const existing = await db.collection('history')
        .where('kidId', '==', kidId)
        .where('itemId', '==', itemId)
        .where('type', '==', 'chore')
        .where('status', '==', 'pending')
        .limit(1).get();
      if (!existing.empty) return;
    }
    return db.collection('history').add({
      kidId, kidName, itemId, itemName, type,
      points: Number(points),
      status: type === 'redeem' ? 'approved' : 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getPending() {
    const snap = await db.collection('history')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getKidHistory(kidId) {
    const snap = await db.collection('history')
      .where('kidId', '==', kidId)
      .orderBy('createdAt', 'desc').limit(50).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async approveRequest(requestId, kidId, points) {
    await db.collection('history').doc(requestId).update({ status: 'approved' });
    await Store.addPoints(kidId, points);
  },

  async rejectRequest(requestId) {
    await db.collection('history').doc(requestId).update({ status: 'rejected' });
  },

  // ==================== Shopping List ====================

  async getShoppingItems() {
    const snap = await db.collection('shopping').orderBy('createdAt').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addShoppingItem(name, category = 'other') {
    return db.collection('shopping').add({
      name, category, checked: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async toggleShoppingItem(id, checked) {
    return db.collection('shopping').doc(id).update({ checked });
  },

  async deleteShoppingItem(id) {
    return db.collection('shopping').doc(id).delete();
  },

  async clearCheckedItems() {
    const snap = await db.collection('shopping').where('checked', '==', true).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    return batch.commit();
  },

  // ==================== Parent Tasks ====================

  async getTasks() {
    const snap = await db.collection('tasks').orderBy('createdAt').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addTask(title, assignedTo = '', priority = 'normal', dueDate = '') {
    return db.collection('tasks').add({
      title, assignedTo, priority, dueDate, done: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async toggleTask(id, done) {
    return db.collection('tasks').doc(id).update({ done });
  },

  async updateTask(id, data) {
    return db.collection('tasks').doc(id).update(data);
  },

  async deleteTask(id) { return db.collection('tasks').doc(id).delete(); },

  // ==================== Calendar Events ====================

  async getEvents() {
    const snap = await db.collection('events').orderBy('date').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addEvent(title, date, time = '', member = '', color = '#f0a500') {
    return db.collection('events').add({
      title, date, time, member, color,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async updateEvent(id, data) {
    return db.collection('events').doc(id).update(data);
  },

  async deleteEvent(id) { return db.collection('events').doc(id).delete(); },

  // ==================== Meals Planner ====================

  async getMeals() {
    const snap = await db.collection('meals').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async setMeal(date, type, description) {
    const key = `${date}_${type}`;
    return db.collection('meals').doc(key).set({
      date, type, description,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async deleteMeal(id) { return db.collection('meals').doc(id).delete(); },

  // ==================== Family Messages ====================

  async getMessages() {
    const snap = await db.collection('messages').orderBy('createdAt', 'desc').limit(30).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addMessage(text, author = '👤') {
    return db.collection('messages').add({
      text, author, pinned: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async togglePinMessage(id, pinned) {
    return db.collection('messages').doc(id).update({ pinned });
  },

  async deleteMessage(id) { return db.collection('messages').doc(id).delete(); },

  // ==================== Successes (הצלחות) ====================

  async getSuccesses(kidId, date) {
    const types = ['stop', 'investigator', 'timer', 'effort', 'friendship'];
    const docs = await Promise.all(
      types.map(type => db.collection('successes').doc(`${kidId}_${type}_${date}`).get())
    );
    return docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
  },

  async addSuccess(kidId, type, date) {
    const key = `${kidId}_${type}_${date}`;
    const docRef = db.collection('successes').doc(key);
    const doc = await docRef.get();
    if (doc.exists) {
      const newCount = (doc.data().count || 0) + 1;
      await docRef.update({ count: newCount });
      return newCount;
    } else {
      await docRef.set({ kidId, type, date, count: 1 });
      return 1;
    }
  },

  // ==================== Seed Default Data ====================

  async seedDefaults() {
    const chores = await Store.getChores();
    if (chores.length === 0) {
      await Store.addChore('לסדר את המיטה', 10, 'morning');
      await Store.addChore('לעשות שיעורי בית', 20, 'afternoon');
      await Store.addChore('לנקות את החדר', 15, 'afternoon');
      await Store.addChore('לעזור במטבח', 15, 'evening');
      await Store.addChore('לקרוא ספר', 20, 'evening');
    }
    const prizes = await Store.getPrizes();
    if (prizes.length === 0) {
      await Store.addPrize('ארוחת ערב לבחירה', 50);
      await Store.addPrize('5 שקלים', 100);
      await Store.addPrize('מתנה קטנה', 100);
      await Store.addPrize('זמן מסך נוסף (30 דק׳)', 30);
      await Store.addPrize('לבחור סרט לערב', 40);
    }
  }
};
