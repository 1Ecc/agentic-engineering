<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { sendMail } from '../lib/api'
import { parseAddressList, type EmailDraft } from '../lib/mail-draft'

const props = defineProps<{ draft: EmailDraft | null }>()
const emit = defineEmits<{ (event: 'sent', messageId: string): void }>()

const isExpanded = ref(false)
const isSending = ref(false)
const message = ref('')
const editable = reactive({ to: '', cc: '', subject: '', body: '' })

watch(
  () => props.draft,
  (draft) => {
    editable.to = draft?.to.join('; ') ?? ''
    editable.cc = draft?.cc.join('; ') ?? ''
    editable.subject = draft?.title ?? ''
    editable.body = draft?.body ?? ''
    isExpanded.value = Boolean(draft)
    message.value = ''
  },
  { immediate: true },
)

async function send() {
  if (isSending.value) return
  isSending.value = true
  message.value = ''
  try {
    const result = await sendMail({
      to: parseAddressList(editable.to),
      cc: parseAddressList(editable.cc),
      subject: editable.subject,
      body: editable.body,
    })
    message.value = `发送成功：${result.message_id}`
    emit('sent', result.message_id)
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <div class="draft-panel">
    <div class="section-heading">
      <h2>邮件草稿</h2>
      <button
        v-if="draft"
        type="button"
        class="text-button"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? '收起' : '展开编辑' }}
      </button>
      <span v-else>未命中</span>
    </div>

    <div v-if="draft && !isExpanded" class="draft-body">
      <h3>{{ draft.title }}</h3>
      <p><b>收件人：</b>{{ draft.to.join('、') }}</p>
      <p v-if="draft.cc.length"><b>抄送：</b>{{ draft.cc.join('、') }}</p>
      <blockquote>{{ draft.body }}</blockquote>
    </div>

    <form v-else-if="draft" class="draft-editor" @submit.prevent="send">
      <label>
        收件人
        <input v-model="editable.to" placeholder="多个邮箱用分号或换行分隔" />
      </label>
      <label>
        抄送
        <input v-model="editable.cc" placeholder="多个邮箱用分号或换行分隔" />
      </label>
      <label>
        主题
        <input v-model="editable.subject" />
      </label>
      <label>
        正文
        <textarea v-model="editable.body" rows="8"></textarea>
      </label>
      <div class="draft-actions">
        <button type="submit" :disabled="isSending">
          {{ isSending ? '发送中' : '发送邮件' }}
        </button>
        <span v-if="message">{{ message }}</span>
      </div>
    </form>

    <div v-else class="empty-state">
      <strong>暂无异常邮件</strong>
    </div>
  </div>
</template>
