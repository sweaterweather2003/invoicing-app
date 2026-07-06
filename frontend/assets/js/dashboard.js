document.addEventListener('DOMContentLoaded', async () => {
  const data = await apiRequest('/documents/recent');
  
  const container = document.getElementById('recentDocuments');
  container.innerHTML = `
    <table class="w-full">
      <thead class="bg-gray-50">
        <tr>
          <th class="py-4 px-6 text-left">Document</th>
          <th class="py-4 px-6 text-left">Client</th>
          <th class="py-4 px-6 text-left">Amount</th>
          <th class="py-4 px-6 text-left">Status</th>
          <th class="py-4 px-6 text-left">Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(doc => `
          <tr class="border-t hover:bg-gray-50">
            <td class="py-4 px-6">${doc.number}</td>
            <td class="py-4 px-6">${doc.clientName}</td>
            <td class="py-4 px-6 font-medium">₹${doc.total}</td>
            <td class="py-4 px-6">
              <span class="px-3 py-1 rounded-full text-sm ${doc.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                ${doc.status}
              </span>
            </td>
            <td class="py-4 px-6 text-gray-500">${new Date(doc.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
});