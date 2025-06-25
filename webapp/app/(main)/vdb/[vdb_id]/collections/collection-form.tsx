"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { post } from "@/lib/request";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

async function createCollection(data: { name: string; description?: string; vdb_id: number }) {
  return post(`/collection`, data);
}

async function testCollectionConnection(vdb_id: number) {
  return post(`/collection/test-connection`, vdb_id);
}

interface CollectionFormProps {
  vdbId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function CollectionForm({ vdbId, open, onOpenChange, onCreated }: CollectionFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [testing, setTesting] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleTest = async () => {
    setTesting(true);
    setError("");
    try {
      const res = await testCollectionConnection(vdbId);
      if (res.code === 200) {
        setTestPassed(true);
      } else {
        setTestPassed(false);
        setError(res.message || "连接测试失败");
      }
    } catch (e: any) {
      setTestPassed(false);
      setError(e.message || "连接测试异常");
    } finally {
      setTesting(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await createCollection({ name, description, vdb_id: vdbId });
      if (res.code === 200) {
        onOpenChange(false);
        setName("");
        setDescription("");
        setTestPassed(false);
        onCreated?.();
        router.refresh();
      } else {
        setError(res.message || "创建失败");
      }
    } catch (e: any) {
      setError(e.message || "创建异常");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建 Collection</DialogTitle>
          <DialogDescription>
            请填写 Collection 的名称和描述，测试连接通过后可创建。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="名称" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="描述（可选）" value={description} onChange={e => setDescription(e.target.value)} />
          <Button onClick={handleTest} disabled={testing || !name} variant="outline">
            {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!testing && testPassed && <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />}
            {!testing && !testPassed && error && <XCircle className="w-4 h-4 mr-2 text-red-500" />}
            {testing ? "测试中..." : testPassed ? "连接已通过" : "测试连接"}
          </Button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!testPassed || creating || !name}>
            {creating ? "创建中..." : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 